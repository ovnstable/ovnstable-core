// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Balancer.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "hardhat/console.sol";


contract StrategyUniV3Dai is Strategy, IERC721Receiver {

    // --- params

    IERC20 public usdc;
    IERC20 public dai;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleDai;

    INonfungiblePositionManager public npm;
    uint24 public fee;
    IUniswapV3Pool public pool;

    int24 public tickLower;
    int24 public tickUpper;

    uint256 public tokenId;

    uint256 public usdcDm;
    uint256 public daiDm;

    IVault public balancerVault;
    bytes32 public poolId;

    uint256 public allowedSwapSlippage;
    uint256 public allowedStakeSlippage;

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
        uint24 fee;
        address pool;
        int24 tickLower;
        int24 tickUpper;
        uint256 allowedSwapSlippage;
        uint256 allowedStakeSlippage;
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
        fee = params.fee;
        tickLower = params.tickLower;
        tickUpper = params.tickUpper;

        balancerVault = IVault(params.balancerVault);
        poolId = params.poolId;

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals(); 
        daiDm = 10 ** IERC20Metadata(params.dai).decimals();

        allowedSwapSlippage = params.allowedSwapSlippage;
        allowedStakeSlippage = params.allowedStakeSlippage;

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

        require(_isAllLiquidityInBaseAsset(), 'Stake with split liquidity is not supported');

        uint256 daiAmount = dai.balanceOf(address(this));

        if (tokenId == 0) {
            INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
                token0 : address(dai),
                token1 : address(usdc),
                fee: fee,
                tickLower : tickLower,
                tickUpper : tickUpper,
                amount0Desired : daiAmount,
                amount1Desired : 0,
                amount0Min : 0,
                amount1Min : 0,
                recipient : address(this),
                deadline : block.timestamp
            });

            (tokenId,,,) = npm.mint(params);

        } else {
            INonfungiblePositionManager.IncreaseLiquidityParams memory params = INonfungiblePositionManager.IncreaseLiquidityParams({
                tokenId: tokenId,
                amount0Desired: daiAmount,
                amount1Desired: 0,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            });

            npm.increaseLiquidity(params);
        }

    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_isAllLiquidityInBaseAsset(), 'Partial unstake with split liquidity is not supported');

        if (tokenId == 0) {
            return 0;
        }

        _amount = OvnMath.reverseSubBasisPoints(_amount, allowedSwapSlippage + allowedStakeSlippage);

        (uint160 sqrtPriceX96,,,,,,) = pool.slot0();
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            TickMath.getSqrtRatioAtTick(tickLower),
            TickMath.getSqrtRatioAtTick(tickUpper),
            _amount,
            0
        );

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

        uint256 daiBalance = dai.balanceOf(address(this));

        return daiBalance;
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        if (tokenId == 0) {
            return 0;
        }

        (,,,,,,,uint128 liquidity,,,,) = npm.positions(tokenId);
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
        tokenId = 0;

        if (usdc.balanceOf(address(this)) > 10**3) {
            uint256 daiAmountMin = OvnMath.subBasisPoints(usdToDai(usdcToUsd(usdc.balanceOf(address(this)))), allowedSwapSlippage);
            _swap(usdc, dai, daiAmountMin);
        }

        return dai.balanceOf(address(this));
    }

    function resetNewPosition(int24 _tickLower, int24 _tickUpper) external onlyAdmin {

        if (tokenId > 0) {

            require(_isAllLiquidityInBaseAsset(), 'Reset new position with split liquidity is not supported');

            (,,,,,,,uint128 liquidity,,,,) = npm.positions(tokenId);
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

            tokenId = 0;
        }

        if (usdc.balanceOf(address(this)) > 10**3) {
            uint256 daiAmountMin = OvnMath.subBasisPoints(usdToDai(usdcToUsd(usdc.balanceOf(address(this)))), allowedSwapSlippage);
            _swap(usdc, dai, daiAmountMin);
        }

        tickLower = _tickLower;
        tickUpper = _tickUpper;

        uint256 daiAmount = dai.balanceOf(address(this));

        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
                token0 : address(dai),
                token1 : address(usdc),
                fee: fee,
                tickLower : tickLower,
                tickUpper : tickUpper,
                amount0Desired : daiAmount,
                amount1Desired : 0,
                amount0Min : 0,
                amount1Min : 0,
                recipient : address(this),
                deadline : block.timestamp
            });

        (tokenId,,,) = npm.mint(params);
    }

    function _swap(IERC20 token0, IERC20 token1, uint256 minAmount) internal {

        uint256 token0Balance = token0.balanceOf(address(this));
        BalancerLibrary.swap(
            balancerVault,
            IVault.SwapKind.GIVEN_IN,
            address(token0),
            address(token1),
            poolId,
            token0Balance,
            minAmount,
            address(this),
            address(this)
        );
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        (uint256 balance0, uint256 balance1) = (0, 0);
        if (tokenId > 0) {
            (,,,,,,,uint128 liquidity,,,,) = npm.positions(tokenId);
            if (liquidity > 0) {
                (uint160 sqrtRatioX96,,,,,,) = pool.slot0();
                uint160 sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(tickLower);
                uint160 sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(tickUpper);
                (balance0, balance1) = LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, sqrtRatioAX96, sqrtRatioBX96, liquidity);
            }
        }
        uint256 daiBalance = balance0 + dai.balanceOf(address(this));
        uint256 usdcBalance = usdToDai(usdcToUsd(balance1 + usdc.balanceOf(address(this))));
        return daiBalance + usdcBalance;
    }

    function daiToUsd(uint256 amount) public view returns (uint256) {
        return amount * uint256(oracleDai.latestAnswer()) / daiDm / 100;
    }

    function usdcToUsd(uint256 amount) public view returns (uint256) {
        return amount * uint256(oracleUsdc.latestAnswer()) / usdcDm / 100;
    }

    function usdToUsdc(uint256 amount) public view returns (uint256) {
        return amount * 100 * usdcDm / uint256(oracleUsdc.latestAnswer());
    }

    function usdToDai(uint256 amount) public view returns (uint256) {
        return amount * 100 * daiDm / uint256(oracleDai.latestAnswer());
    }

    function _isAllLiquidityInBaseAsset() internal view returns (bool) {
        (,int24 tick,,,,,) = pool.slot0();
        return tick < tickLower;
    }

    function getPriceBySqrtRatio(uint160 sqrtRatio) public view returns (uint256) {
        uint256 price = FullMath.mulDiv(uint256(sqrtRatio) * 10**10, uint256(sqrtRatio) * 10**8, 2 ** (96+96));
        return price;
    }

    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = x / 2 + 1;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    function getPriceByTick(int24 tick) public view returns (uint256) {
        uint160 sqrtRatio = TickMath.getSqrtRatioAtTick(tick);
        uint256 price = FullMath.mulDiv(uint256(sqrtRatio) * 10**10, uint256(sqrtRatio) * 10**8, 2 ** (96+96));
        return price;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {

        INonfungiblePositionManager.CollectParams memory collectParam = INonfungiblePositionManager.CollectParams(tokenId, address(this), type(uint128).max, type(uint128).max);
        npm.collect(collectParam);

        return 0;
    }

    function onERC721Received(address, address, uint256, bytes memory) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }

}
