// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

import "./core/Strategy.sol";

import "./exchanges/QuickSwapExchange.sol";

import "./connectors/uniswap/v3/interfaces/INonfungiblePositionManager.sol";
import "./connectors/uniswap/v3/interfaces/IUniswapV3Pool.sol";
import "./connectors/uniswap/v3/interfaces/ISwapRouterV3.sol";
import "./connectors/uniswap/v3/libraries/LiquidityAmounts.sol";

import "./connectors/arrakis/IArrakisV1RouterStaking.sol";
import "./connectors/arrakis/IArrakisRewards.sol";

import "hardhat/console.sol";
import "./exchanges/BalancerExchange.sol";
import "./connectors/uniswap/v3/libraries/TickMath.sol";
import "./connectors/arrakis/IArrakisVault.sol";

contract StrategyArrakis is Strategy, BalancerExchange {


    IERC20 public usdcToken;
    IERC20 public usdtToken;
    IERC20 public wmaticToken;

    IArrakisV1RouterStaking arrakisRouter;
    IArrakisRewards arrakisRewards;
    IArrakisVault arrakisVault;

    IUniswapV3Pool uniswapV3Pool;
    INonfungiblePositionManager uniswapPositionManager;

    bytes32 public balancerPoolIdStable; // Stable Pool
    bytes32 public balancerPoolIdWmatic; // Wmatic/USDC Pool

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setTokens(
        address _usdcToken,
        address _usdtToken,
        address _wmaticToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_usdtToken != address(0), "Zero address not allowed");
        require(_wmaticToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        usdtToken = IERC20(_usdtToken);
        wmaticToken = IERC20(_wmaticToken);
    }

    function setParams(
        address _arrakisRouter,
        address _arrakisRewards,
        address _arrakisVault,
        address _balancerVault,
        bytes32 _balancerPoolIdStable,
        bytes32 _balancerPoolIdWmatic,
        address _uniswapPositionManager
    ) external onlyAdmin {

        require(_arrakisRouter != address(0), "Zero address not allowed");
        require(_arrakisRewards != address(0), "Zero address not allowed");
        require(_arrakisVault != address(0), "Zero address not allowed");
        require(_balancerVault != address(0), "Zero address not allowed");
        require(_uniswapPositionManager != address(0), "Zero address not allowed");
        require(_balancerPoolIdStable != "", "Empty pool id not allowed");
        require(_balancerPoolIdWmatic != "", "Empty pool id not allowed");

        arrakisRouter = IArrakisV1RouterStaking(_arrakisRouter);
        arrakisRewards = IArrakisRewards(_arrakisRewards);
        arrakisVault = IArrakisVault(_arrakisVault);

        uniswapV3Pool = IUniswapV3Pool(arrakisVault.pool());
        uniswapPositionManager = INonfungiblePositionManager(_uniswapPositionManager);

        balancerPoolIdStable = _balancerPoolIdStable;
        balancerPoolIdWmatic = _balancerPoolIdWmatic;
        setBalancerVault(_balancerVault);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        require(_asset == address(usdcToken), "Some token not compatible");

        // 1. Swap USDC to needed USDT amount
        _buyNeedAmountUsdt();

        uint256 usdcAmount = usdcToken.balanceOf(address(this));
        uint256 usdtAmount = usdtToken.balanceOf(address(this));

        // 2. Calculating min amounts
        (uint256 amount0In, uint256 amount1In, ) = arrakisVault.getMintAmounts(usdcAmount, usdtAmount);

        // 3. Stake USDC/USDT to Arrakis
        usdcToken.approve(address(arrakisRouter), usdcAmount);
        usdtToken.approve(address(arrakisRouter), usdtAmount);

        // 4. Add tokens to uniswap v3 pools across Arrakis
        arrakisRouter.addLiquidityAndStake(address(arrakisRewards), usdcAmount, usdtAmount, amount0In, amount1In, address(this));
    }

    function _getNeedToByUsdt(uint256 _amount) internal returns (uint256){

        (uint160 lowerTick, uint160 upperTick, uint160 sqrtPriceX96) = _uniswapPoolParams();

        (uint256 amountLiq0, uint256 amountLiq1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtPriceX96,
            lowerTick,
            upperTick,
            uniswapV3Pool.liquidity());

        if (amountLiq0 >= amountLiq1) {

            uint256 ratio = (amountLiq0 * 10 ** 18) / amountLiq1;
            uint256 usdcBalance = _amount;
            uint256 needUsdtValue = (usdcBalance * 10 ** 18) / (ratio + 10 ** 18);
            // t=N/(r+1)
            return needUsdtValue;
        } else {
            revert("Amount liquidity USDT more then USDC");
        }
    }

    function _buyNeedAmountUsdt() internal {

        uint256 neededUsdtBalance = _getNeedToByUsdt(usdcToken.balanceOf(address(this)));
        uint256 currentUsdtBalance = usdtToken.balanceOf(address(this));

        if (currentUsdtBalance <= neededUsdtBalance) {
            neededUsdtBalance = neededUsdtBalance - currentUsdtBalance;
            swap(balancerPoolIdStable, IVault.SwapKind.GIVEN_OUT, IAsset(address(usdcToken)), IAsset(address(usdtToken)), address(this), address(this), neededUsdtBalance);
        }

    }


    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");

        // 1. Calculating amount USDC/USDT
        uint256 usdtAmount = _getNeedToByUsdt(_amount);
        uint256 usdcAmount = _amount - usdtAmount;

        (uint160 lowerTick, uint160 upperTick, uint160 sqrtPriceX96) = _uniswapPoolParams();


        // 2. Calculating need amount lp tokens - depends on amount USDC/USDT
        uint256 amountLp = uint256(LiquidityAmounts.getLiquidityForAmounts(sqrtPriceX96, lowerTick, upperTick, usdcAmount, usdtAmount));


        // 3. Get tokens USDC/USDT from Arrakis
        arrakisRewards.approve(address(arrakisRouter), amountLp);
        arrakisRouter.removeLiquidityAndUnstake(address(arrakisRewards), amountLp, usdcAmount, usdtAmount, address(this));


        // 4. Swap USDT to USDC
        swap(balancerPoolIdStable, IVault.SwapKind.GIVEN_IN, IAsset(address(usdtToken)), IAsset(address(usdcToken)), address(this), address(this), usdtToken.balanceOf(address(this)), 0);

        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");


        // 1. Get balance LP tokens
        uint256 amountLp = arrakisRewards.balanceOf(address(this));

        if (amountLp == 0)
            return 0;


        // 2. Calculating amount usdc/usdt under lp tokens
        (uint160 lowerTick, uint160 upperTick, uint160 sqrtPriceX96) = _uniswapPoolParams();

        (uint256 amountLiq0, uint256 amountLiq1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtPriceX96,
            lowerTick,
            upperTick,
            LiquidityAmounts.toUint128(amountLp));

        // 3. Get usdc/usdt tokens from Arrakis
        arrakisRewards.approve(address(arrakisRouter), amountLp);
        arrakisRouter.removeLiquidityAndUnstake(address(arrakisRewards), amountLp, amountLiq0, amountLiq1, address(this));


        // 4. Swap USDT to USDC tokens on Balancer
        swap(balancerPoolIdStable, IVault.SwapKind.GIVEN_IN, IAsset(address(usdtToken)), IAsset(address(usdcToken)), address(this), address(this), usdtToken.balanceOf(address(this)), 0);

        return usdcToken.balanceOf(address(this));
    }


    function netAssetValue() external override view returns (uint256) {
        return _getTotal();
    }

    function liquidationValue() external override view returns (uint256) {
        return _getTotal();
    }


    function _uniswapPoolParams() internal view returns (uint160 lowerTick, uint160 upperTick, uint160 sqrtPriceX96){

        uint160 lowerTick = TickMath.getSqrtRatioAtTick(arrakisVault.lowerTick());
        uint160 upperTick = TickMath.getSqrtRatioAtTick(arrakisVault.upperTick());

        (uint160 sqrtPriceX96,,,,,,) = uniswapV3Pool.slot0();

        return (lowerTick, upperTick, sqrtPriceX96);
    }


    function _getTotal() internal view returns (uint256){

        uint256 balanceLp = arrakisRewards.balanceOf(address(this));

        if (balanceLp == 0)
            return 0;

        (uint160 lowerTick, uint160 upperTick, uint160 sqrtPriceX96) = _uniswapPoolParams();

        // Balance LP tokens == pool liquidity
        // Details: https://github.com/tintinweb/smart-contract-sanctuary-ethereum/blob/80b9ddcbca94e30006ee74efc60d10bf661a53e3/contracts/mainnet/d6/d68b055fb444D136e3aC4df023f4C42334F06395_ArrakisVaultV1.sol#L1742

        (uint256 amountLiq0, uint256 amountLiq1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtPriceX96,
            lowerTick,
            upperTick,
            LiquidityAmounts.toUint128(balanceLp));

        // index 1 - USDC
        uint256 totalUsdc = usdcToken.balanceOf(address(this)) + amountLiq0;

        // index 2 - USDT
        uint256 totalUsdt = usdtToken.balanceOf(address(this)) + amountLiq1;


        // check how many USDC tokens we will get if we sell USDT tokens now
        return totalUsdc + onSwap(balancerPoolIdStable, IVault.SwapKind.GIVEN_OUT, usdcToken, usdtToken, totalUsdt);

    }


    function _claimRewards(address _to) internal override returns (uint256) {

        if(arrakisRewards.balanceOf(address(this)) != 0){
            arrakisRewards.claim_rewards(address(this));
        }

        uint256 wmaticBalance = wmaticToken.balanceOf(address(this));

        if (wmaticBalance > 0) {

            uint256 usdcAmount = swap(balancerPoolIdWmatic, IVault.SwapKind.GIVEN_IN, IAsset(address(wmaticToken)),
                IAsset(address(usdcToken)), address(this), address(this), wmaticBalance, 0);

            usdcToken.transfer(_to, usdcAmount);
            return usdcAmount;
        } else {
            return 0;
        }

    }


}
