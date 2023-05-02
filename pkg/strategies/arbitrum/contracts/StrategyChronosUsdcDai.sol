// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chronos.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Gmx.sol";

import "hardhat/console.sol";

contract StrategyChronosUsdcDai is Strategy {

    IERC20 public usdc;
    IERC20 public dai;
    IERC20 public chr;

    uint256 public usdcDm;
    uint256 public daiDm;

    IChronosRouter public router;
    IChronosGauge public gauge;
    IChronosPair public pair;
    IChronosNFT public nft;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleDai;

    IRouter public gmxRouter;
    IVault public gmxVault;
    GmxReader public gmxReader;

    ISwapRouter public uniswapV3Router;

    uint256 public tokenId;

    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address dai;
        address chr;
        address router;
        address gauge;
        address pair;
        address nft;
        address oracleUsdc;
        address oracleDai;
        address uniswapV3Router;
        address gmxRouter;
        address gmxVault;
        address gmxReader;
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
        chr = IERC20(params.chr);

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        daiDm = 10 ** IERC20Metadata(params.dai).decimals();

        router = IChronosRouter(params.router);
        gauge = IChronosGauge(params.gauge);
        pair = IChronosPair(params.pair);
        nft = IChronosNFT(params.nft);

        gmxRouter = IRouter(params.gmxRouter);
        gmxVault = IVault(params.gmxVault);
        gmxReader = GmxReader(params.gmxReader);

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleDai = IPriceFeed(params.oracleDai);

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        (uint256 reserveDai, uint256 reserveUsdc,) = pair.getReserves();
        require(reserveUsdc > 10 ** 3 && reserveDai > 10 ** 15, 'Liquidity lpToken reserves too low');

        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 daiBalance = dai.balanceOf(address(this));

        uint256 amountUsdcIn = GmxLibrary.getAmountToSwap(
            gmxVault,
            gmxReader,
            address(usdc),
            address(dai),
            usdcBalance,
            reserveUsdc,
            reserveDai,
            usdcDm,
            daiDm,
            1
        );

        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleDaiToUsdc(amountUsdcIn), swapSlippageBP);

        _swap(address(usdc), address(dai), amountUsdcIn, amountOutMin);

        usdcBalance = usdc.balanceOf(address(this));
        daiBalance = dai.balanceOf(address(this));

        usdc.approve(address(router), usdcBalance);
        dai.approve(address(router), daiBalance);

        router.addLiquidity(
            address(usdc),
            address(dai),
            true,
            usdcBalance,
            daiBalance,
            OvnMath.subBasisPoints(usdcBalance, stakeSlippageBP),
            OvnMath.subBasisPoints(daiBalance, stakeSlippageBP),
            address(this),
            block.timestamp
        );

        _stakeToGauge();
    }

    function _stakeToGauge() internal {

        uint256 pairBalance = pair.balanceOf(address(this));
        pair.approve(address(gauge), pairBalance);

        if(tokenId != 0){
            uint256 tokenIdNew = gauge.deposit(pairBalance);
            gauge.harvestAndMerge(tokenIdNew, tokenId);
        }else {
            tokenId = gauge.deposit(pairBalance);
        }
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 totalLpBalance = pair.totalSupply();
        (uint256 reserveDai, uint256 reserveUsdc,) = pair.getReserves();

        uint256 amountLp = GmxLibrary.getAmountLpTokens(
            gmxVault,
            gmxReader,
            address(usdc),
            address(dai),
            OvnMath.addBasisPoints(_amount + 10, swapSlippageBP),
            totalLpBalance,
            reserveUsdc,
            reserveDai,
            usdcDm,
            daiDm,
            1
        );

        uint256 pairBalance = gauge.balanceOf(address(this));

        if (amountLp > pairBalance) {
            amountLp = pairBalance;
        }

        uint256 amountUsdc = reserveUsdc * amountLp / totalLpBalance;
        uint256 amountDai = reserveDai * amountLp / totalLpBalance;

        _unstakeFromGauge(amountLp);

        pair.approve(address(router), amountLp);
        router.removeLiquidity(
            address(usdc),
            address(dai),
            true,
            amountLp,
            OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP),
            OvnMath.subBasisPoints(amountDai, stakeSlippageBP),
            address(this),
            block.timestamp
        );

        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleDaiToUsdc(daiBalance), swapSlippageBP);
        _swap(address(dai), address(usdc), daiBalance, amountOutMin);

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 pairBalance = gauge.balanceOf(address(this));

        if (pairBalance == 0) {
            return usdc.balanceOf(address(this));
        }

        _unstakeFromGauge(pairBalance);

        uint256 totalLpBalance = pair.totalSupply();
        (uint256 reserveDai, uint256 reserveUsdc,) = pair.getReserves();

        uint256 amountUsdc = reserveUsdc * pairBalance / totalLpBalance;
        uint256 amountDai = reserveDai * pairBalance / totalLpBalance;

        pair.approve(address(router), pairBalance);
        router.removeLiquidity(
            address(usdc),
            address(dai),
            true,
            pairBalance,
            OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP),
            OvnMath.subBasisPoints(amountDai, stakeSlippageBP),
            address(this),
            block.timestamp
        );

        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleDaiToUsdc(daiBalance), swapSlippageBP);
        _swap(address(dai), address(usdc), daiBalance, amountOutMin);

        return usdc.balanceOf(address(this));
    }

    function _unstakeFromGauge(uint256 pairBalance) internal {

        if(gauge.balanceOf(address(this)) == pairBalance){
            gauge.withdrawAndHarvest(tokenId);
        }else {
            uint[] memory amounts = new uint256[](2);
            amounts[0] = pairBalance;
            amounts[1] = gauge.balanceOf(address(this)) - pairBalance;
            gauge.harvestAndSplit(amounts, tokenId);

            // Index 1 - contains token with needed pair amounts
            uint256[] memory splitTokenIds = nft.maGaugeTokensOfOwner(address(this), address(gauge));
            gauge.withdrawAndHarvest(splitTokenIds[1]);
        }
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

        uint256 pairBalance = gauge.balanceOf(address(this));
        if (pairBalance > 0) {
            uint256 totalLpBalance = pair.totalSupply();
            (uint256 reserveDai, uint256 reserveUsdc,) = pair.getReserves();
            usdcBalance += reserveUsdc * pairBalance / totalLpBalance;
            daiBalance += reserveDai * pairBalance / totalLpBalance;
        }

        uint256 usdcBalanceFromDai;
        if (daiBalance > 0) {
            if (nav) {
                usdcBalanceFromDai = _oracleDaiToUsdc(daiBalance);
            } else {
                usdcBalanceFromDai = GmxLibrary.getAmountOut(gmxVault, gmxReader, address(dai), address(usdc), daiBalance);
            }
        }

        return usdcBalance + usdcBalanceFromDai;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        if (gauge.balanceOf(address(this)) == 0) {
            return 0;
        }

        uint256 usdcBefore = usdc.balanceOf(address(this));

        // claim rewards
        gauge.getReward(tokenId);

        // sell rewards
        uint256 chrBalance = chr.balanceOf(address(this));
        if (chrBalance > 0) {
            uint256 amountOut = ChronosLibrary.getAmountsOut(
                router,
                address(chr),
                address(usdc),
                false,
                chrBalance
            );

            if (amountOut > 0) {
                ChronosLibrary.singleSwap(
                    router,
                    address(chr),
                    address(usdc),
                    false,
                    chrBalance,
                    amountOut * 99 / 100,
                    address(this)
                );
            }

        }

        uint256 totalUsdc = usdc.balanceOf(address(this)) - usdcBefore;
        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
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

    function _swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin) internal {

        // Gmx Vault has max limit for accepting tokens, for example DAI max capacity: 35kk$
        // If after swap vault of balance more capacity then transaction revert
        // We check capacity and if it not enough then use other swap route (UniswapV3)


        // AmountIn expand to 18 decimal because gmx store all amounts in 18 decimals
        // USDC - 6 decimals => +12 decimals
        // DAI - 18 decimals => +0 decimals
        uint256 capacityAfterSwap = gmxVault.poolAmounts(address(tokenIn));
        console.log('Capacity       %s', capacityAfterSwap);

        capacityAfterSwap += amountIn * (10 ** (18 - IERC20Metadata(tokenIn).decimals()));

        console.log('AmountIn       %s', amountIn);
        console.log('AmountIn       %s', amountIn * (10 ** (18 - IERC20Metadata(tokenIn).decimals())));
        console.log('CapacityAmount %s', capacityAfterSwap);

        uint256 maxCapacity = gmxVault.maxUsdgAmounts(address(tokenIn));
        console.log('MaxCapacity    %s', maxCapacity);


        if (maxCapacity > capacityAfterSwap) {
            GmxLibrary.singleSwap(
                gmxRouter,
                address(tokenIn),
                address(tokenOut),
                amountIn,
                amountOutMin);

        } else {
            UniswapV3Library.singleSwap(
                uniswapV3Router,
                address(tokenIn),
                address(tokenOut),
                100,
                address(this),
                amountIn,
                amountOutMin
            );
        }
    }

}
