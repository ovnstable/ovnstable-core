// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Balancer.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "hardhat/console.sol";


contract StrategyMavUsdbcDai is Strategy, IERC721Receiver {

    // --- params

    IERC20 public usdc;
    IERC20 public dai;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleDai;

    INonfungiblePositionManager public npm;
    uint24 public fee;
    int24 public tickSpacing;
    IUniswapV3Pool public pool;

    int24 public tickLowerBorder;
    int24 public tickUpperBorder;

    uint256 public tokenIdMain;
    uint256 public tokenIdExtra;

    uint256 public usdcDm;
    uint256 public daiDm;

    uint256 public usdcMin;
    uint256 public daiMin;

    IVault public balancerVault;
    bytes32 public poolId;

    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address dai;
        address oracleUsdc;
        address oracleDai;
        address balancerVault;
        bytes32 poolId;
        address npm;
        address pool;
        int24 tickLowerBorder;
        int24 tickUpperBorder;
    }


    // --- constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- setters

    function setParams(StrategyParams calldata params) external onlyAdmin {

        usdc = IERC20(params.usdc);
        dai = IERC20(params.dai);

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleDai = IPriceFeed(params.oracleDai);

        npm = INonfungiblePositionManager(params.npm);
        pool = IUniswapV3Pool(params.pool);
        tickLowerBorder = params.tickLowerBorder;
        tickUpperBorder = params.tickUpperBorder;

        balancerVault = IVault(params.balancerVault);
        poolId = params.poolId;

        fee = pool.fee();
        tickSpacing = pool.tickSpacing();

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        daiDm = 10 ** IERC20Metadata(params.dai).decimals();

        usdcMin = usdcDm / 1000;
        daiMin = daiDm / 1000;

        dai.approve(address(npm), type(uint256).max);
        usdc.approve(address(npm), type(uint256).max);
        dai.approve(address(balancerVault), type(uint256).max);
        usdc.approve(address(balancerVault), type(uint256).max);

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        _removeAllLiquidityFromPool();

        // _swap(usdc, dai, _amount / 3, 0);

        getStrategyInfo();

        _addMainLiquidity(0);
        _addRemainingLiquidity(0);

        require(isFewBase(0), 'base asset should be all in pool');
        require(isFewSide(0), 'side asset should be all in pool');
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        _removeAllLiquidityFromPool();
        _prepareLiquidityToReturn(_amount);
        _addMainLiquidity(_amount); 
        _addRemainingLiquidity(_amount);

        require(isFewBase(_amount), 'base asset should be all in pool');
        require(isFewSide(0), 'side asset should be all in pool');

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        _removeAllLiquidityFromPool();
        _swapAllSideToBase();
        
        return usdc.balanceOf(address(this));
    }

    //todo add modifier
    function balance() public {

        _removeAllLiquidityFromPool();
        _addMainLiquidity(0); 
        _addRemainingLiquidity(0);

        require(isFewBase(0), 'base asset should be all in pool');
        require(isFewSide(0), 'side asset should be all in pool');
    }

    function _removeAllLiquidityFromPool() private {

        _removeLiquidityByToken(tokenIdMain);
        _removeLiquidityByToken(tokenIdExtra);

        tokenIdMain = 0;
        tokenIdExtra = 0;
    }

    function _removeLiquidityByToken(uint256 tokenId) private {

        if (tokenId == 0) {
            return;
        }

        (,,,,,,,uint128 liquidity,,,,) = npm.positions(tokenId);

        if (liquidity == 0) {
            return;
        }

        INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager.DecreaseLiquidityParams({
            tokenId: tokenId,
            liquidity: liquidity,
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp
        });

        npm.decreaseLiquidity(params);

        INonfungiblePositionManager.CollectParams memory collectParam = INonfungiblePositionManager.CollectParams(tokenId, address(this), type(uint128).max, type(uint128).max);
        npm.collect(collectParam);
    }

    function _addMainLiquidity(uint256 baseNeedToRemain) private {

        if (isFewBase(baseNeedToRemain) || isFewSide(0)) {
            return;
        }

        (,int24 tick,,,,,) = pool.slot0();
        (int24 tickLower, int24 tickUpper) = getCorrectTicks(tick);

        uint256 baseBalance = usdc.balanceOf(address(this)) - baseNeedToRemain;
        uint256 sideBalance = dai.balanceOf(address(this));
        
        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0 : address(dai),
            token1 : address(usdc),
            fee: fee,
            tickLower : tickLower,
            tickUpper : tickUpper,
            amount0Desired : sideBalance,
            amount1Desired : baseBalance,
            amount0Min : 0,
            amount1Min : 0,
            recipient : address(this),
            deadline : block.timestamp
        });

        (tokenIdMain,,,) = npm.mint(params);
    }

    function _addRemainingLiquidity(uint256 baseNeedToRemain) private {

        int24 tickLower;
        int24 tickUpper;

        (,int24 tick,,,,,) = pool.slot0();
        (int24 nearTickLeft, int24 nearTickRight) = getCorrectTicks(tick);

        if (!isFewBase(baseNeedToRemain)) {    
            tickLower = nearTickLeft - tickSpacing;
            tickUpper = nearTickLeft;
        } else if (!isFewSide(0)) {
            tickLower = nearTickRight + tickSpacing;
            tickUpper = nearTickRight + tickSpacing + tickSpacing;
        } else {
            revert("Free assets amount should be less");
        }

        uint256 baseBalance = usdc.balanceOf(address(this)) - baseNeedToRemain;
        uint256 sideBalance = dai.balanceOf(address(this));

        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0 : address(dai),
            token1 : address(usdc),
            fee: fee,
            tickLower : tickLower,
            tickUpper : tickUpper,
            amount0Desired : sideBalance,
            amount1Desired : baseBalance,
            amount0Min : 0,
            amount1Min : 0,
            recipient : address(this),
            deadline : block.timestamp
        });

        (tokenIdExtra,,,) = npm.mint(params);
    }

    function _prepareLiquidityToReturn(uint256 baseNeedToRemain) private {

        uint256 baseBalance = usdc.balanceOf(address(this));

        if (baseBalance >= baseNeedToRemain) {
            return;
        }

        uint256 neededToGet = baseNeedToRemain - baseBalance;
        neededToGet = neededToGet < usdcMin ? usdcMin : neededToGet;

        uint256 daiAmount = OvnMath.addBasisPoints(_oracleUsdcToDai(neededToGet), swapSlippageBP);
        _swap(dai, usdc, daiAmount, neededToGet);
    }

    function _swapAllSideToBase() private {

        if (isFewSide(0)) {
            return;
        }

        uint256 usdcAmountMin = OvnMath.subBasisPoints(_oracleDaiToUsdc(dai.balanceOf(address(this))), swapSlippageBP);
        _swap(dai, usdc, dai.balanceOf(address(this)), usdcAmountMin);
    }

    function _swap(IERC20 token0, IERC20 token1, uint256 amount, uint256 minAmount) private {

        BalancerLibrary.swap(
            balancerVault,
            IVault.SwapKind.GIVEN_IN,
            address(token0),
            address(token1),
            poolId,
            amount,
            minAmount,
            address(this),
            address(this)
        );
    }

    function getAmounts(uint256 tokenId) public view returns (uint256 balance0, uint256 balance1) {

        if (tokenId == 0) {
            return (0, 0);
        }

        (,,,,, int24 tickLower, int24 tickUpper, uint128 liquidity,,,,) = npm.positions(tokenId);

        if (liquidity == 0) {
            return (0, 0);
        }

        (uint160 sqrtRatioX96,,,,,,) = pool.slot0();
        uint160 sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(tickLower);
        uint160 sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(tickUpper);
        (balance0, balance1) = LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, sqrtRatioAX96, sqrtRatioBX96, liquidity);
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        (uint256 balanceDai, uint256 balanceUsdc) = (dai.balanceOf(address(this)), usdc.balanceOf(address(this)));

        (uint256 balance00, uint256 balance01) = getAmounts(tokenIdMain);
        (uint256 balance10, uint256 balance11) = getAmounts(tokenIdExtra);
        return balanceUsdc + balance01 + balance11 + _oracleDaiToUsdc(balanceDai + balance00 + balance10);
    }

    function _oracleDaiToUsdc(uint256 daiAmount) internal view returns (uint256) {
        uint256 priceDai = ChainlinkLibrary.getPrice(oracleDai);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(daiAmount, daiDm, usdcDm, priceDai, priceUsdc);
    }

    function _oracleUsdcToDai(uint256 usdcAmount) internal view returns (uint256) {
        uint256 priceDai = ChainlinkLibrary.getPrice(oracleDai);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(usdcAmount, usdcDm, daiDm, priceUsdc, priceDai);
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {

        if (tokenIdMain != 0) {
            INonfungiblePositionManager.CollectParams memory collectParam = INonfungiblePositionManager.CollectParams(tokenIdMain, address(this), type(uint128).max, type(uint128).max);
            npm.collect(collectParam);
        }

        if (tokenIdExtra != 0) {
            INonfungiblePositionManager.CollectParams memory collectParam = INonfungiblePositionManager.CollectParams(tokenIdExtra, address(this), type(uint128).max, type(uint128).max);
            npm.collect(collectParam);
        }

        return 0;
    }

    function onERC721Received(address, address, uint256, bytes memory) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    struct StrategyInfo {
        bool needToBalance;
        uint256 mainBase;
        uint256 mainSide;
        uint256 extraBase;
        uint256 extraSide;
        uint256 freeBase;
        uint256 freeSide;
        uint256 oraclePrice;
        uint256 poolPrice;
        uint256 nav;
    }

    function getStrategyInfo() public returns (StrategyInfo memory strategyInfo) {

        strategyInfo.needToBalance = _needToBalance(tokenIdMain) || _needToBalance(tokenIdExtra);
        (strategyInfo.mainSide, strategyInfo.mainBase) = getAmounts(tokenIdMain);
        (strategyInfo.extraSide, strategyInfo.extraBase) = getAmounts(tokenIdExtra);
        strategyInfo.freeBase = usdc.balanceOf(address(this));
        strategyInfo.freeSide = dai.balanceOf(address(this));
        strategyInfo.oraclePrice = _oracleDaiToUsdc(daiDm);
        (uint160 sqrtRatioX96,,,,,,) = pool.slot0();
        strategyInfo.poolPrice = getPriceBySqrtRatio(sqrtRatioX96);
        strategyInfo.nav = _totalValue();
    }

    function _needToBalance(uint256 tokenId) private view returns (bool) {

        if (tokenId == 0) {
            return false;
        }

        (,,,,, int24 tickLower,, uint128 liquidity,,,,) = npm.positions(tokenId);

        if (liquidity == 0) {
            return false;
        }

        (,int24 tick,,,,,) = pool.slot0();
        (int24 tickLowerPool,) = getCorrectTicks(tick);
        bool farDistance = abs(tickLowerPool, tickLower) > 1;
        bool beyondBorders = tickLowerPool < tickLowerBorder || tickUpperPool > tickUpperBorder;
        return farDistance && !beyondBorders;
    }

    function logSign(string memory msg, int256 value) private view {
        if (value < 0) {
            console.log(msg, "-", uint256(- value));
        } else {
            console.log(msg, uint256(value));
        }
    }

    function getPriceBySqrtRatio(uint160 sqrtRatio) private view returns (uint256) {
        uint256 price = FullMath.mulDiv(uint256(sqrtRatio) * 10**10, uint256(sqrtRatio) * 10**8, 2 ** (96+96));
        return price;
    }

    function sqrt(uint256 x) private pure returns (uint256 y) {
        uint256 z = x / 2 + 1;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    function abs(int24 x, int24 y) internal pure returns (uint256) {
        return (x > y) ? uint24(x - y) : uint24(y - x);
    }

    function isFewBase(uint256 allowedBalance) private view returns (bool) {
        return usdc.balanceOf(address(this)) - allowedBalance < usdcMin;
    }

    function isFewSide(uint256 allowedBalance) private view returns (bool) {
        return dai.balanceOf(address(this)) - allowedBalance < daiMin;
    }

    function getCorrectTicks(int24 tick) private view returns (int24 tickLower, int24 tickUpper) {
        return ((tick / tickSpacing - 1) * tickSpacing, tick / tickSpacing * tickSpacing);
    }

}
