// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/core/contracts/interfaces/IStaker.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/KyberSwap.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Curve.sol";

import "./libraries/KyberSwapRewardUsdcDaiLibrary.sol";

import "hardhat/console.sol";

contract StrategyKyberSwapUsdcDai is Strategy {


    // --- params

    IERC20 public dai;
    IERC20 public usdc;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleDai;

    uint256 public usdcDm;
    uint256 public daiDm;

    ISwapRouter public uniswapV3Router;

    AntiSnipAttackPositionManager public npm;
    Pool public pool;
    uint24 fee;
    uint256 tokenId;
    uint256 poolId;

    int24 lowerTick;
    int24 upperTick;

    KyberSwapElasticLM public lm;

    address curvePool;

    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address dai;
        address oracleUsdc;
        address oracleDai;
        address uniswapV3Router;
        address pool;
        address npm;
        address lm;
        address curvePool;
        uint24 fee;
        uint256 poolId;
        int24 lowerTick;
        int24 upperTick;

    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdc = IERC20(params.usdc);
        dai = IERC20(params.dai);

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleDai = IPriceFeed(params.oracleDai);

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        daiDm = 10 ** IERC20Metadata(params.dai).decimals();

        curvePool = params.curvePool;

        pool = Pool(params.pool);
        npm = AntiSnipAttackPositionManager(params.npm);
        lm = KyberSwapElasticLM(params.lm);
        poolId = params.poolId;

        lowerTick = params.lowerTick;
        upperTick = params.upperTick;

        fee = params.fee;

        usdc.approve(params.npm, type(uint256).max);
        dai.approve(params.npm, type(uint256).max);

        npm.setApprovalForAll(params.lm, true);

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        _swapUsdcToDai();

        uint256 usdcAmount = usdc.balanceOf(address(this));
        uint256 daiAmount = dai.balanceOf(address(this));

        int24[2] memory ticksPrevious;
        (ticksPrevious[0], ticksPrevious[1]) = getPreviousTicks(lowerTick, upperTick);

        if (tokenId == 0) {

            MintParams memory params = MintParams({
                token0 : address(usdc),
                token1 : address(dai),
                fee : fee,
                tickLower : lowerTick,
                tickUpper : upperTick,
                ticksPrevious : ticksPrevious,
                amount0Desired : usdcAmount,
                amount1Desired : daiAmount,
                amount0Min : 0,
                amount1Min : 0,
                recipient : address(this),
                deadline : block.timestamp
            });


            (tokenId,,,) = npm.mint(params);
        } else {

            _exitAndWithdrawNFT();

            IncreaseLiquidityParams memory params = IncreaseLiquidityParams({
                tokenId : tokenId,
                ticksPrevious : ticksPrevious,
                amount0Desired : usdcAmount,
                amount1Desired : daiAmount,
                amount0Min : 0,
                amount1Min : 0,
                deadline : block.timestamp
            });

            npm.addLiquidity(params);
        }

        _depositAndJoinNFT();

    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        _amount = OvnMath.addBasisPoints(_amount, swapSlippageBP);

        uint256 amountDai = _calcUsdcAmountToSwap(_amount) * 1e12;
        uint256 amountUsdc = _amount - (amountDai / 1e12);

        _exitAndWithdrawNFT();

        (uint160 sqrtP, , ,) = pool.getPoolState();

        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtP,
            TickMath.getSqrtRatioAtTick(lowerTick),
            TickMath.getSqrtRatioAtTick(upperTick),
            amountUsdc,
            amountDai
        );

        _removeLiquidity(liquidity);
        _swapAllDaiToUsdc();

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        if(tokenId > 0){

            uint256 liquidity = getLiquidity();

            _exitAndWithdrawNFT();
            _removeLiquidity(liquidity);
            claimFeesNft();

            tokenId = 0;

            _swapAllDaiToUsdc();
        }



        return usdc.balanceOf(address(this));
    }


    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 daiBalance = dai.balanceOf(address(this));

        if (tokenId > 0) {

            uint128 liquidity = getLiquidity();
            if (liquidity > 0) {
                uint160 sqrtRatioX96 = getCurrentSqrtRatio();
                uint160 sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(lowerTick);
                uint160 sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(upperTick);
                (uint256 usdcAmount, uint256 daiAmount) = LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, sqrtRatioAX96, sqrtRatioBX96, liquidity);

                usdcBalance += usdcAmount;
                daiBalance += daiAmount;
            }
        }

        if (daiBalance > 0) {
            if (nav) {
                usdcBalance += _oracleDaiToUsdc(daiBalance);
            } else {
                usdcBalance += OvnMath.subBasisPoints(_oracleDaiToUsdc(daiBalance), swapSlippageBP);
            }
        }


        return usdcBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {


        if(tokenId == 0 || !isJoined()){
            return 0;
        }

        uint256[] memory nftIds = new uint256[](1);
        nftIds[0] = tokenId;

        uint256[] memory pIds = new uint256[](1);
        pIds[0] = poolId;

        bytes[] memory datas = new bytes[](1);
        datas[0] = abi.encode(IKyberSwapElasticLM.HarvestData(pIds));

        claimFeesNft();
        lm.harvestMultiplePools(nftIds, datas);

        uint256 totalUsdc;

        totalUsdc += KyberSwapRewardUsdcDaiLibrary.swapKnc();
        totalUsdc += KyberSwapRewardUsdcDaiLibrary.swapOp();

        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }



    function _swapAllDaiToUsdc() internal {

        uint256 daiBalance = dai.balanceOf(address(this));

        uint256 usdcMinAmount = OvnMath.subBasisPoints(_oracleDaiToUsdc(daiBalance), swapSlippageBP);
        CurveLibrary.swap(
            curvePool,
            address(dai),
            address(usdc),
            daiBalance,
            usdcMinAmount
        );
    }

    function _removeLiquidity(uint256 liquidity) internal {

        RemoveLiquidityParams memory params = RemoveLiquidityParams({
            tokenId : tokenId,
            liquidity : uint128(liquidity),
            amount0Min : 0,
            amount1Min : 0,
            deadline : block.timestamp
        });

        npm.removeLiquidity(params);
        npm.transferAllTokens(address(usdc), 0, address(this));
        npm.transferAllTokens(address(dai), 0, address(this));
    }

    function _depositAndJoinNFT() internal {
        uint256[] memory nftIds = new uint256[](1);
        nftIds[0] = tokenId;

        uint256[] memory liqs = new uint256[](1);
        liqs[0] = getLiquidity();

        lm.deposit(nftIds);
        lm.join(poolId, nftIds, liqs);
    }

    function _exitAndWithdrawNFT() internal {

        uint256[] memory nftIds = new uint256[](1);
        nftIds[0] = tokenId;

        if(isJoined()){
            uint256[] memory liqs = new uint256[](1);
            (liqs[0],,) = lm.getUserInfo(tokenId, poolId);
            lm.exit(poolId, nftIds, liqs);
        }

        (address owner,) = lm.positions(tokenId);
        if (owner == address(this)) {
            lm.withdraw(nftIds);
        }
    }

    function getCurrentSqrtRatio() public view returns (uint160 sqrtRatioX96) {
        (sqrtRatioX96,,,) = pool.getPoolState();
    }

    function updatePoolId(uint256 _poolId) external onlyPortfolioAgent {
        _exitAndWithdrawNFT();

        poolId = _poolId;

        _depositAndJoinNFT();
    }

    function isJoined() internal returns(bool){
        uint256[] memory pools = lm.getJoinedPools(tokenId);
        return pools.length > 0;
    }

    function claimFeesNft() internal {

        (Position memory pos,) = npm.positions(tokenId);
        if (pos.rTokenOwed > 0) {
            uint256[] memory nftIds = new uint256[](1);
            nftIds[0] = tokenId;
            lm.claimFee(nftIds, 0, 0, address(pool), false, block.timestamp);
        }
    }

    function getLiquidity() public view returns (uint128 liquidity) {
        if (tokenId > 0) {
            (Position memory pos,) = npm.positions(tokenId);
            liquidity = pos.liquidity;
        }
    }

    function _swapUsdcToDai() internal {

        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 usdcBalance = usdc.balanceOf(address(this));

        (uint160 sqrtP, , ,) = pool.getPoolState();
        (uint128 baseL,,) = pool.getLiquidityState();

        (uint256 amountUsdc, uint256 amountDai) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtP,
            TickMath.getSqrtRatioAtTick(lowerTick),
            TickMath.getSqrtRatioAtTick(upperTick),
            baseL);

        uint256 amountUsdcToSwap = CurveLibrary.getAmountToSwap(
            curvePool,
            address(usdc),
            address(dai),
            usdcBalance,
            amountUsdc,
            amountDai,
            usdcDm,
            daiDm,
            1
        );

        // swap USDC to needed DAI amount
        uint256 daiMinAmount = OvnMath.subBasisPoints(_oracleUsdcToDai(amountUsdcToSwap), swapSlippageBP) - 1e13;
        CurveLibrary.swap(
            curvePool,
            address(usdc),
            address(dai),
            amountUsdcToSwap,
            daiMinAmount
        );

    }

    function _calcUsdcAmountToSwap(uint256 _amount) internal returns (uint256){

        (uint160 sqrtP, , ,) = pool.getPoolState();
        (uint128 baseL,,) = pool.getLiquidityState();

        (uint256 amountUsdc, uint256 amountDai) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtP,
            TickMath.getSqrtRatioAtTick(lowerTick),
            TickMath.getSqrtRatioAtTick(upperTick),
            baseL);


        uint256 needUsdcValue = (_amount * amountDai) / (amountUsdc * daiDm / usdcDm + amountDai);
        return needUsdcValue;
    }

    function getPreviousTicks(int24 lowerTick, int24 upperTick) public view returns(int24 lowerPrevious, int24 upperPrevious) {
        address ticksFeesReaderAddress = 0x8Fd8Cb948965d9305999D767A02bf79833EADbB3;
        int24[] memory allTicks = TicksFeesReader(ticksFeesReaderAddress).getTicksInRange(
            IPoolStorage(address(pool)), -887272, 150);

        uint256 l = 0;
        uint256 r = allTicks.length - 1;
        uint256 m = 0;

        while (l + 1 < r) {
            m = (l+r)/2;
            if (allTicks[m] <= lowerTick) {
                l = m;
            } else {
                r = m;
            }
        }

        if (allTicks[l] <= lowerTick) lowerPrevious = allTicks[l];
        if (allTicks[r] <= lowerTick) lowerPrevious = allTicks[r];


        l = 0;
        r = allTicks.length - 1;

        while (l + 1 < r) {
            m = (l+r)/2;
            if (allTicks[m] <= upperTick) {
                l = m;
            } else {
                r = m;
            }
        }

        if (allTicks[l] <= upperTick) upperPrevious = allTicks[l];
        if (allTicks[r] <= upperTick) upperPrevious = allTicks[r];
    }

    function _oracleDaiToUsdc(uint256 amount) internal view returns (uint256) {
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        uint256 priceDai = uint256(oracleDai.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(amount, daiDm, usdcDm, priceDai, priceUsdc);
    }

    function _oracleUsdcToDai(uint256 amount) internal view returns (uint256) {
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        uint256 priceDai = uint256(oracleDai.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(amount, usdcDm, daiDm, priceUsdc, priceDai);
    }
}
