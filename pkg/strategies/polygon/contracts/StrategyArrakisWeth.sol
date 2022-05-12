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


contract StrategyArrakisWeth is Strategy, BalancerExchange {

    uint256 constant BASIS_POINTS_FOR_SLIPPAGE = 4;
    uint256 constant HF = 1500000000000000000;
    uint256 constant LT = 850000000000000000;
    uint256 constant MAX_UINT_VALUE = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
    uint256 constant BALANCING_DELTA = 10000000000000000;

    IERC20 public usdcToken;
    IERC20 public aUsdcToken;
    IERC20 public wethToken;
    IERC20 public wmaticToken;

    IArrakisV1RouterStaking arrakisRouter;
    IArrakisRewards arrakisRewards;
    IArrakisVault arrakisVault;
    IPriceFeed priceFeed;

    IUniswapV3Pool uniswapV3Pool;
    INonfungiblePositionManager uniswapPositionManager;

    IPool aavePool;

    bytes32 public balancerPoolIdWmatic;

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setTokens(
        address _usdcToken,
        address _wethToken,
        address _wmaticToken,
        address _aUsdcToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_wethToken != address(0), "Zero address not allowed");
        require(_wmaticToken != address(0), "Zero address not allowed");
        require(_aUsdcToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        wethToken = IERC20(_wethToken);
        wmaticToken = IERC20(_wmaticToken);
        aUsdcToken = IERC20(_aUsdcToken);
    }

    function setParams(
        address _arrakisRouter,
        address _arrakisRewards,
        address _arrakisVault,
        address _balancerVault,
        bytes32 _balancerPoolIdWmatic,
        address _uniswapPositionManager,
        address _aaveProvider,
        address _priceFeed
    ) external onlyAdmin {

        require(_arrakisRouter != address(0), "Zero address not allowed");
        require(_arrakisRewards != address(0), "Zero address not allowed");
        require(_arrakisVault != address(0), "Zero address not allowed");
        require(_balancerVault != address(0), "Zero address not allowed");
        require(_aaveProvider != address(0), "Zero address not allowed");
        require(_uniswapPositionManager != address(0), "Zero address not allowed");
        require(_priceFeed != address(0), "Zero address not allowed");
        require(_balancerPoolIdWmatic != "", "Empty pool id not allowed");

        arrakisRouter = IArrakisV1RouterStaking(_arrakisRouter);
        arrakisRewards = IArrakisRewards(_arrakisRewards);
        arrakisVault = IArrakisVault(_arrakisVault);
        priceFeed = IPriceFeed(_priceFeed);
        uniswapV3Pool = IUniswapV3Pool(arrakisVault.pool());
        uniswapPositionManager = INonfungiblePositionManager(_uniswapPositionManager);

        balancerPoolIdWmatic = _balancerPoolIdWmatic;
        setBalancerVault(_balancerVault);

        aavePool = IPool(IPoolAddressesProvider(_aaveProvider).getPool());
    }


    // --- logic

    function _allToCollateral(uint256 keepUsdc) internal { 
        uint256 wethAmount = wethToken.balanceOf(address(this));
        if (wethAmount > 0) {
            swap(balancerPoolIdWmatic, IVault.SwapKind.GIVEN_IN, IAsset(address(wethToken)),
                IAsset(address(usdcToken)), address(this), address(this), wethAmount, 0);
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
        (uint256 am0, uint256 am1) = arrakisVault.getUnderlyingBalances();

        if (abs(healthFactor, HF) < BALANCING_DELTA) {
            return healthFactor;
        }

        if (healthFactor > HF) {
            uint256 neededUsdc = ((collateral * LT - borrow * HF) * am0 * 10 ** 18) / (am1 * price * HF + LT * am0 * 10 ** 20);
            uint256 neededWeth = (neededUsdc * am1) / am0;
        
            aavePool.withdraw(address(usdcToken), neededUsdc, address(this));
            aavePool.borrow(address(wethToken), neededWeth, 2, 0, address(this));

            usdcToken.approve(address(arrakisRouter), neededUsdc);
            wethToken.approve(address(arrakisRouter), neededWeth);
            arrakisRouter.addLiquidityAndStake(address(arrakisRewards), neededUsdc, neededWeth, _subBasisPoints(neededUsdc), _subBasisPoints(neededWeth), address(this));
            _allToCollateral(usdcToken.balanceOf(address(this)));
        } else {
            uint256 neededWeth = ((borrow * HF - collateral * LT) * am1 * 10 ** 18) / (am1 * price * HF + LT * am0 * 10 ** 20);
            uint256 amountLp = getLiquidityForWeth(neededWeth);
            arrakisRewards.approve(address(arrakisRouter), amountLp);
            
            (uint256 amount0, uint256 amount1) = removeLiquidityAndUnstakeWithSlippage(amountLp);

            usdcToken.approve(address(aavePool), amount0);
            aavePool.supply(address(usdcToken), amount0, address(this), 0);
            wethToken.approve(address(aavePool), amount1);
            aavePool.repay(address(wethToken), amount1, 2, address(this));
            _allToCollateral(usdcToken.balanceOf(address(this)));
        }
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

        (uint256 amount0Current, uint256 amount1Current) = arrakisVault.getUnderlyingBalances();
        uint256 usdcColletoral = (_amount * price * amount1Current * HF) / (amount0Current * LT * 10**20 + amount1Current * price * HF);
        uint256 wethBorrow = (usdcColletoral * LT * 10**20) / (price * HF);
        
        usdcToken.approve(address(aavePool), usdcColletoral);
        aavePool.supply(address(usdcToken), usdcColletoral, address(this), 0);
        aavePool.borrow(address(wethToken), wethBorrow, 2, 0, address(this));

        uint256 usdcAmount = usdcToken.balanceOf(address(this));
        uint256 wethAmount = wethToken.balanceOf(address(this));

        usdcToken.approve(address(arrakisRouter), usdcAmount);
        wethToken.approve(address(arrakisRouter), wethAmount);

        arrakisRouter.addLiquidityAndStake(address(arrakisRewards), usdcAmount, wethAmount, _subBasisPoints(usdcAmount), _subBasisPoints(wethAmount), address(this));

        _allToCollateral(0);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");

        _allToCollateral(0);

        uint256 price = uint256(priceFeed.latestAnswer());
        (uint256 collateral, uint256 borrow,,,,) = aavePool.getUserAccountData(address(this));
        (uint256 am0, uint256 am1) = arrakisVault.getUnderlyingBalances();

        uint256 wethBorrow = (((_amount * LT * am1 * 100) + (borrow * HF * am1) - (collateral * LT * am1)) * 10 ** 18)/((price * HF * am1) + (LT * am0 * 10 ** 20));
        uint256 amountLp = getLiquidityForWeth(wethBorrow);

        arrakisRewards.approve(address(arrakisRouter), amountLp);
        removeLiquidityAndUnstakeWithSlippage(amountLp);

        wethToken.approve(address(aavePool), wethToken.balanceOf(address(this)));
        aavePool.repay(address(wethToken), wethToken.balanceOf(address(this)), 2, address(this));
        uint256 getusdc = _amount - (wethBorrow * am0) / am1;
        aavePool.withdraw(address(usdcToken), getusdc, address(this));

        _allToCollateral(_amount);
        
        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");

        uint256 amountLp = arrakisRewards.balanceOf(address(this));
        
        arrakisRewards.approve(address(arrakisRouter), amountLp);
        removeLiquidityAndUnstakeWithSlippage(amountLp);

        uint256 usdcForSwap = 100000;
        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        if (usdcBalance < usdcForSwap) {
            usdcForSwap = usdcBalance;
        }
        swap(balancerPoolIdWmatic, IVault.SwapKind.GIVEN_IN, IAsset(address(usdcToken)),
                IAsset(address(wethToken)), address(this), address(this), usdcForSwap, 0);
                
        wethToken.approve(address(aavePool), wethToken.balanceOf(address(this)));
        aavePool.repay(address(wethToken), MAX_UINT_VALUE, 2, address(this));
        aavePool.withdraw(address(usdcToken), MAX_UINT_VALUE, address(this));

        swap(balancerPoolIdWmatic, IVault.SwapKind.GIVEN_IN, IAsset(address(wethToken)),
                IAsset(address(usdcToken)), address(this), address(this), wethToken.balanceOf(address(this)), 0);

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
        (uint256 amountLiq0, ) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtPriceX96,
            lowerTick,
            upperTick,
            LiquidityAmounts.toUint128(balanceLp));

        //this addition need to correlate with removeLiquidityAndUnstake
        amountLiq0 = amountLiq0 + amountLiq0 * 865 / 100000; 

        uint256 totalUsdc = usdcToken.balanceOf(address(this)) + amountLiq0;
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

    function getLiquidityForWeth(uint256 wethBorrow) internal view returns (uint256) {
        (uint160 lowerTick, uint160 upperTick, uint160 sqrtPriceX96) = _uniswapPoolParams();
        uint256 BIG_USDC = 10000000000000;
        uint256 amountLp = uint256(LiquidityAmounts.getLiquidityForAmounts(sqrtPriceX96, lowerTick, upperTick, BIG_USDC, wethBorrow));
        return amountLp;
    }

    function removeLiquidityAndUnstakeWithSlippage(uint256 amountLp) internal returns (uint256, uint256) {
        (uint160 lowerTick, uint160 upperTick, uint160 sqrtPriceX96) = _uniswapPoolParams();
        (uint256 amountLiq0, uint256 amountLiq1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtPriceX96,
            lowerTick,
            upperTick,
            LiquidityAmounts.toUint128(amountLp));
        (uint256 amount0, uint256 amount1,) = arrakisRouter.removeLiquidityAndUnstake(address(arrakisRewards), amountLp, _subBasisPoints(amountLiq0), _subBasisPoints(amountLiq1), address(this));
        return (amount0, amount1);
    }

    function _subBasisPoints(uint256 amount) internal pure returns (uint256) {
        uint256 basisDenominator = 10 ** 4;
        return amount * (basisDenominator - BASIS_POINTS_FOR_SLIPPAGE) / basisDenominator;
    }
}
