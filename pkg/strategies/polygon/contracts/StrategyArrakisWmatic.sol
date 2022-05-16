// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

import "./core/Strategy.sol";

import "./exchanges/UniswapV2Exchange.sol";

import "./connectors/uniswap/v3/interfaces/INonfungiblePositionManager.sol";
import "./connectors/uniswap/v3/interfaces/IUniswapV3Pool.sol";
import "./connectors/uniswap/v3/interfaces/ISwapRouterV3.sol";
import "./connectors/uniswap/v3/libraries/LiquidityAmounts.sol";

import "./connectors/arrakis/IArrakisV1RouterStaking.sol";
import "./connectors/arrakis/IArrakisRewards.sol";

import "./exchanges/BalancerExchange.sol";
import "./connectors/uniswap/v3/libraries/TickMath.sol";
import "./connectors/arrakis/IArrakisVault.sol";

import "./connectors/aave/interfaces/IPool.sol";
import "./connectors/aave/interfaces/IPriceFeed.sol";
import "./connectors/aave/interfaces/IPoolAddressesProvider.sol";


contract StrategyArrakisWmatic is Strategy, BalancerExchange {

    uint256 constant BASIS_POINTS_FOR_SLIPPAGE = 1400;
    uint256 constant MAX_UINT_VALUE = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
    uint256 constant BALANCING_DELTA = 10000000000000000;

    IERC20 public usdcToken;
    IERC20 public aUsdcToken;
    IERC20 public secondToken;
    IERC20 public wmaticToken;

    IArrakisV1RouterStaking arrakisRouter;
    IArrakisRewards arrakisRewards;
    IArrakisVault arrakisVault;
    IPriceFeed priceFeed;

    IUniswapV3Pool uniswapV3Pool;
    INonfungiblePositionManager uniswapPositionManager;

    IPool aavePool;

    bytes32 public balancerPoolIdWmatic;
    bytes32 public balancerPoolIdToken;
    uint256 public tokenDenominator;
    uint256 LT;
    uint256 HF;
    uint8 usdcTokenInversion;
    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setTokens(
        address _usdcToken,
        address _secondToken,
        address _wmaticToken,
        address _aUsdcToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_secondToken != address(0), "Zero address not allowed");
        require(_wmaticToken != address(0), "Zero address not allowed");
        require(_aUsdcToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        secondToken = IERC20(_secondToken);
        wmaticToken = IERC20(_wmaticToken);
        aUsdcToken = IERC20(_aUsdcToken);

        tokenDenominator = 10 ** IERC20Metadata(_secondToken).decimals();
    }

    function setParams(
        address _arrakisRouter,
        address _arrakisRewards,
        address _arrakisVault,
        address _balancerVault,
        bytes32 _balancerPoolIdToken,
        bytes32 _balancerPoolIdWmatic,
        address _uniswapPositionManager
    ) external onlyAdmin {

        require(_arrakisRouter != address(0), "Zero address not allowed");
        require(_arrakisRewards != address(0), "Zero address not allowed");
        require(_arrakisVault != address(0), "Zero address not allowed");
        require(_balancerVault != address(0), "Zero address not allowed");
        require(_uniswapPositionManager != address(0), "Zero address not allowed");
        require(_balancerPoolIdToken != "", "Empty pool id not allowed");
        require(_balancerPoolIdWmatic != "", "Empty pool id not allowed");

        arrakisRouter = IArrakisV1RouterStaking(_arrakisRouter);
        arrakisRewards = IArrakisRewards(_arrakisRewards);
        arrakisVault = IArrakisVault(_arrakisVault);

        uniswapV3Pool = IUniswapV3Pool(arrakisVault.pool());
        uniswapPositionManager = INonfungiblePositionManager(_uniswapPositionManager);

        balancerPoolIdToken = _balancerPoolIdToken;
        balancerPoolIdWmatic = _balancerPoolIdWmatic;
        setBalancerVault(_balancerVault);
    }

    function setAaveParams(
        address _aaveProvider,
        address _priceFeed,
        uint8 _eModeCategoryId,
        uint256 _liquidationThreshold,
        uint256 _healthFactor,
        uint8 _usdcTokenInversion
    ) external onlyAdmin {

        require(_aaveProvider != address(0), "Zero address not allowed");
        require(_priceFeed != address(0), "Zero address not allowed");

        priceFeed = IPriceFeed(_priceFeed);
        aavePool = IPool(IPoolAddressesProvider(_aaveProvider).getPool());
        aavePool.setUserEMode(_eModeCategoryId);
        LT = _liquidationThreshold * 10 ** 15;
        HF = _healthFactor * 10 ** 15;
        usdcTokenInversion = _usdcTokenInversion;
    }

    // --- logic

    function _allToCollateral(uint256 keepUsdc) internal { 
        uint256 secondAmount = secondToken.balanceOf(address(this));
        if (secondAmount > 0) {
            swap(balancerPoolIdToken, IVault.SwapKind.GIVEN_IN, IAsset(address(secondToken)),
                IAsset(address(usdcToken)), address(this), address(this), secondAmount, 0);
        }
        uint256 usdcAmount = usdcToken.balanceOf(address(this));
        if (usdcAmount > keepUsdc) {
            usdcToken.approve(address(aavePool), usdcAmount - keepUsdc);
            aavePool.supply(address(usdcToken), usdcAmount - keepUsdc, address(this), 0);
        }
    }

    function _healthFactorBalance() internal override returns (uint256) { 
        
        (uint256 collateral, uint256 borrow,,,,uint256 healthFactor) = aavePool.getUserAccountData(address(this));
        uint256 price = uint256(priceFeed.latestAnswer());
        (uint256 am0, uint256 am1) = _getUnderlyingBalances();

        if (abs(healthFactor, HF) < BALANCING_DELTA) {
            return healthFactor;
        }

        if (healthFactor > HF) {
            uint256 neededUsdc = ((collateral * LT - borrow * HF) * am0 * tokenDenominator) / (am1 * price * HF + LT * am0 * tokenDenominator * 100);
            uint256 neededSecondToken = (neededUsdc * am1) / am0;
        
            aavePool.withdraw(address(usdcToken), neededUsdc, address(this));
            aavePool.borrow(address(secondToken), neededSecondToken, 2, 0, address(this));

            usdcToken.approve(address(arrakisRouter), neededUsdc);
            secondToken.approve(address(arrakisRouter), neededSecondToken);
            _addLiquidityAndStakeWithSlippage(neededUsdc, neededSecondToken);
        } else {
            uint256 neededSecondToken = ((borrow * HF - collateral * LT) * am1 * tokenDenominator) / (am1 * price * HF + LT * am0 * tokenDenominator * 100);
            uint256 amountLp = _getLiquidityForToken(neededSecondToken);
            arrakisRewards.approve(address(arrakisRouter), amountLp);
            
            (uint256 amount0, uint256 amount1) = _removeLiquidityAndUnstakeWithSlippage(amountLp);

            usdcToken.approve(address(aavePool), amount0);
            aavePool.supply(address(usdcToken), amount0, address(this), 0);

            secondToken.approve(address(aavePool), amount1);
            aavePool.repay(address(secondToken), amount1, 2, address(this));
        }

        _allToCollateral(usdcToken.balanceOf(address(this)));
        (,,,,, healthFactor) = aavePool.getUserAccountData(address(this));
        return healthFactor;
    }

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override { 
        require(_asset == address(usdcToken), "Some token not compatible");

        _allToCollateral(_amount);

        uint256 price = uint256(priceFeed.latestAnswer());
        (uint256 amount0Current, uint256 amount1Current) = _getUnderlyingBalances();
        uint256 usdcColletoral = (_amount * price * amount1Current * HF) / (amount0Current * LT * tokenDenominator * 100 + amount1Current * price * HF);
        uint256 secondBorrow = (usdcColletoral * LT * tokenDenominator * 100) / (price * HF);
        
        usdcToken.approve(address(aavePool), usdcColletoral);
        aavePool.supply(address(usdcToken), usdcColletoral, address(this), 0);
        aavePool.borrow(address(secondToken), secondBorrow, 2, 0, address(this));

        uint256 usdcAmount = usdcToken.balanceOf(address(this));
        uint256 secondAmount = secondToken.balanceOf(address(this));

        usdcToken.approve(address(arrakisRouter), usdcAmount);
        secondToken.approve(address(arrakisRouter), secondAmount);
        _addLiquidityAndStakeWithSlippage(usdcAmount, secondAmount);

        _allToCollateral(0);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");

        _allToCollateral(0);

        uint256 realAmount = _amount;
        _amount = _addBasisPoints(_amount);

        uint256 price = uint256(priceFeed.latestAnswer());
        (uint256 collateral, uint256 borrow,,,,) = aavePool.getUserAccountData(address(this));
        (uint256 am0, uint256 am1) = _getUnderlyingBalances();

        uint256 secondBorrow = (((_amount * LT * am1 * 100) + (borrow * HF * am1) - (collateral * LT * am1)) * tokenDenominator)/((price * HF * am1) + (LT * am0 * tokenDenominator * 100));
        uint256 amountLp = _getLiquidityForToken(secondBorrow);

        arrakisRewards.approve(address(arrakisRouter), amountLp);
        _removeLiquidityAndUnstakeWithSlippage(amountLp);

        secondToken.approve(address(aavePool), secondToken.balanceOf(address(this)));
        aavePool.repay(address(secondToken), secondToken.balanceOf(address(this)), 2, address(this));
        
        uint256 getusdc = _amount - (secondBorrow * am0) / am1;
        aavePool.withdraw(address(usdcToken), getusdc, address(this));
        
        _allToCollateral(realAmount);
        
        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");

        uint256 amountLp = arrakisRewards.balanceOf(address(this));
        
        arrakisRewards.approve(address(arrakisRouter), amountLp);
        _removeLiquidityAndUnstakeWithSlippage(amountLp);

        uint256 usdcForSwap = 100000;
        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        if (usdcBalance < usdcForSwap) {
            usdcForSwap = usdcBalance;
        }
        swap(balancerPoolIdToken, IVault.SwapKind.GIVEN_IN, IAsset(address(usdcToken)),
                IAsset(address(secondToken)), address(this), address(this), usdcForSwap, 0);
                
        secondToken.approve(address(aavePool), secondToken.balanceOf(address(this)));
        aavePool.repay(address(secondToken), MAX_UINT_VALUE, 2, address(this));
        aavePool.withdraw(address(usdcToken), MAX_UINT_VALUE, address(this));

        swap(balancerPoolIdToken, IVault.SwapKind.GIVEN_IN, IAsset(address(secondToken)),
                IAsset(address(usdcToken)), address(this), address(this), secondToken.balanceOf(address(this)), 0);

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

        uint256 addUsdc = _getUsdcForLiquidity(balanceLp);
        uint256 totalUsdc = usdcToken.balanceOf(address(this)) + addUsdc;
        uint256 totalAmUsdc = aUsdcToken.balanceOf(address(this));

        return totalUsdc + totalAmUsdc;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        if (arrakisRewards.balanceOf(address(this)) != 0) {
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

    function abs(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x > y) ? (x - y) : (y - x);
    }

    function _getLiquidityForToken(uint256 secondBorrow) internal view returns (uint256) {
        (uint160 lowerTick, uint160 upperTick, uint160 sqrtPriceX96) = _uniswapPoolParams();
        uint256 BIG_USDC = 10000000000000;
        uint256 amountLp;
        if (usdcTokenInversion == 0) {
            amountLp = uint256(LiquidityAmounts.getLiquidityForAmounts(sqrtPriceX96, lowerTick, upperTick, BIG_USDC, secondBorrow));
        } else {
            amountLp = uint256(LiquidityAmounts.getLiquidityForAmounts(sqrtPriceX96, lowerTick, upperTick, secondBorrow, BIG_USDC));
        }
        return amountLp;
    }

    function _getUsdcForLiquidity(uint256 balanceLp) internal view returns (uint256) {
        (uint160 lowerTick, uint160 upperTick, uint160 sqrtPriceX96) = _uniswapPoolParams();
        (uint256 amountLiq0, uint256 amountLiq1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtPriceX96,
            lowerTick,
            upperTick,
            LiquidityAmounts.toUint128(balanceLp));
        return (usdcTokenInversion == 0) ? amountLiq0 : amountLiq1;
    }

    function _addLiquidityAndStakeWithSlippage(uint256 usdcAmount, uint256 secondAmount) internal {
        if (usdcTokenInversion == 0) {
            arrakisRouter.addLiquidityAndStake(address(arrakisRewards), usdcAmount, secondAmount, _subBasisPoints(usdcAmount), _subBasisPoints(secondAmount), address(this));
        } else {
            arrakisRouter.addLiquidityAndStake(address(arrakisRewards), secondAmount, usdcAmount, _subBasisPoints(secondAmount), _subBasisPoints(usdcAmount), address(this));
        }
    }

    function _removeLiquidityAndUnstakeWithSlippage(uint256 amountLp) internal returns (uint256, uint256) {
        (uint160 lowerTick, uint160 upperTick, uint160 sqrtPriceX96) = _uniswapPoolParams();
        (uint256 amountLiq0, uint256 amountLiq1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtPriceX96,
            lowerTick,
            upperTick,
            LiquidityAmounts.toUint128(amountLp));
        (uint256 amount0, uint256 amount1,) = arrakisRouter.removeLiquidityAndUnstake(address(arrakisRewards), amountLp, _subBasisPoints(amountLiq0), _subBasisPoints(amountLiq1), address(this));
        return (usdcTokenInversion == 0) ? (amount0, amount1) : (amount1, amount0);
    }

    function _addBasisPoints(uint256 amount) internal pure returns (uint256) {
        uint256 basisDenominator = 10 ** 4;
        return amount * basisDenominator / (basisDenominator - BASIS_POINTS_FOR_SLIPPAGE);
    }

    function _subBasisPoints(uint256 amount) internal pure returns (uint256) {
        uint256 basisDenominator = 10 ** 4;
        return amount * (basisDenominator - BASIS_POINTS_FOR_SLIPPAGE) / basisDenominator;
    }

    function _getUnderlyingBalances() internal view returns (uint256, uint256) {
        (uint256 amount0, uint256 amount1) = arrakisVault.getUnderlyingBalances();
        return (usdcTokenInversion == 0) ? (amount0, amount1) : (amount1, amount0);
    }
}
