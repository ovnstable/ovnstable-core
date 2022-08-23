// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";


import "@overnight-contracts/connectors/contracts/stuff/Penrose.sol";
import "@overnight-contracts/connectors/contracts/stuff/Dystopia.sol";
import "@overnight-contracts/connectors/contracts/stuff/AaveV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";

import "@overnight-contracts/common/contracts/libraries/WadRayMath.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/common/contracts/libraries/AaveBorrowLibrary.sol";

import "@overnight-contracts/core/contracts/interfaces/IExchange.sol";

import "./libraries/UsdPlusWmaticLibrary.sol";
import "./libraries/EtsCalculationLibrary.sol";
import "./core/HedgeStrategy.sol";

import "hardhat/console.sol";

contract StrategyUsdPlusWmatic is HedgeStrategy {
    using WadRayMath for uint256;
    using UsdPlusWmaticLibrary for StrategyUsdPlusWmatic;

    // --- constants

    uint8 public constant E_MODE_CATEGORY_ID = 0;
    uint256 public constant INTEREST_RATE_MODE = 2; // InterestRateMode.VARIABLE
    uint16 public constant REFERRAL_CODE = 0;
    uint256 public constant BASIS_POINTS_FOR_STORAGE = 100; // 1%
    uint256 public constant BASIS_POINTS_FOR_SLIPPAGE = 400; // 4%
    uint256 public constant MAX_UINT_VALUE = type(uint256).max;

    // --- fields

    IExchange public exchange;

    IERC20 public usdPlus;
    IERC20 public usdc;
    IERC20 public aUsdc;
    IERC20 public wmatic;
    IERC20 public dyst;

    uint256 public usdcDm;
    uint256 public wmaticDm;

    IDystopiaRouter public dystRouter;
    IDystopiaLP public dystRewards;
    IDystopiaLP public dystVault;


    IERC20 public penToken;
    IUserProxy public penProxy;
    IPenLens public penLens;

    // Aave
    IPoolAddressesProvider public aavePoolAddressesProvider;
    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleWmatic;

    uint256 public usdcStorage;

    // in e18
    uint256 public liquidationThreshold;
    uint256 public healthFactor;
    uint256 public balancingDelta;
    uint256 public realHealthFactor;

    uint256 wmaticUsdcSlippagePersent;
    uint24 public poolFeeMaticUsdc;
    ISwapRouter public uniswapV3Router;

    struct SetupParams {
        // tokens
        address usdc;
        address aUsdc;
        address wmatic;
        address usdPlus;
        address penToken;
        address dyst;
        // common
        address exchanger;
        address dystRewards;
        address dystVault;
        address dystRouter;
        address penProxy;
        address penLens;
        uint256 tokenAssetSlippagePercent;
        // aave
        address aavePoolAddressesProvider;
        uint256 liquidationThreshold;
        uint256 healthFactor;
        uint256 balancingDelta;
        // univ3
        address uniswapV3Router;
        uint24 poolFeeMaticUsdc;
    }



    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }

    // --- setters

    function setParams(SetupParams calldata params) external onlyAdmin {
        require(params.usdc != address(0), "ZERO_ADDRESS not allowed");
        require(params.wmatic != address(0), "ZERO_ADDRESS not allowed");

        // tokens
        usdc = IERC20(params.usdc);
        aUsdc = IERC20(params.aUsdc);
        wmatic = IERC20(params.wmatic);
        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        wmaticDm = 10 ** IERC20Metadata(params.wmatic).decimals();

        usdPlus = IERC20(params.usdPlus);
        setAsset(params.usdPlus);

        penToken = IERC20(params.penToken);
        dyst = IERC20(params.dyst);

        // common
        dystRewards = IDystopiaLP(params.dystRewards);
        dystVault = IDystopiaLP(params.dystVault);
        dystRouter = IDystopiaRouter(params.dystRouter);

        penProxy = IUserProxy(params.penProxy);
        penLens = IPenLens(params.penLens);

        exchange = IExchange(params.exchanger);

        wmaticUsdcSlippagePersent = params.tokenAssetSlippagePercent;
        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolFeeMaticUsdc = params.poolFeeMaticUsdc;

        // aave
        aavePoolAddressesProvider = IPoolAddressesProvider(params.aavePoolAddressesProvider);

        IAaveOracle priceOracleGetter = IAaveOracle(aavePoolAddressesProvider.getPriceOracle());
        oracleUsdc = IPriceFeed(priceOracleGetter.getSourceOfAsset(params.usdc));
        oracleWmatic = IPriceFeed(priceOracleGetter.getSourceOfAsset(params.wmatic));

        liquidationThreshold = params.liquidationThreshold * 10 ** 15;
        healthFactor = params.healthFactor * 10 ** 15;
        realHealthFactor = 0;
        balancingDelta = params.balancingDelta * 10 ** 15;

        // approve max
        //TODO: убрать аппрув у предыдущего значения если меняется

        usdPlus.approve(address(dystRouter), type(uint256).max);
        wmatic.approve(address(dystRouter), type(uint256).max);
        dystVault.approve(address(dystRouter), type(uint256).max);

        usdPlus.approve(address(exchange), type(uint256).max);
        usdc.approve(address(exchange), type(uint256).max);
    }

    // --- logic

    function _stake(uint256 _amount) internal override {
        _updateEMode();
        calcDeltas(Method.STAKE, _amount);
    }


    function _unstake(
        uint256 _amount
    ) internal override returns (uint256) {
        _updateEMode();
        calcDeltas(Method.UNSTAKE, _amount);
        return _amount;
    }

    function aavePool() public view returns (IPool){
        return IPool(AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider)));
    }

    function _updateEMode() internal {
        AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider), E_MODE_CATEGORY_ID);
    }


    function balances() external view override returns (BalanceItem[] memory){

        Liquidity memory liq = currentLiquidity();
        Amounts memory amounts = currentAmounts();

        BalanceItem[] memory items = new BalanceItem[](7);
        items[0] = BalanceItem("borrowToken", toUint256(liq.borrowToken), amounts.borrowToken, true);
        items[1] = BalanceItem("collateralAsset", toUint256(liq.collateralAsset), amounts.collateralAsset, false);
        items[2] = BalanceItem("poolToken", toUint256(liq.poolToken), amounts.poolToken, false);
        items[3] = BalanceItem("poolUsdPlus", toUint256(liq.poolUsdPlus), amounts.poolUsdPlus, false);
        items[4] = BalanceItem("freeUsdPlus", toUint256(liq.freeUsdPlus), amounts.freeUsdPlus, false);
        items[5] = BalanceItem("freeAsset", toUint256(liq.freeAsset), amounts.freeAsset, false);
        items[6] = BalanceItem("freeToken", toUint256(liq.freeToken), amounts.freeToken, false);
        return items;
    }


    /**
     * NAV = sum of all tokens liquidity minus borrows.
     * @return NAV in USDC
     */
    function netAssetValue() external view override returns (uint256){
        Liquidity memory liq = currentLiquidity();
        int256 navUsd = EtsCalculationLibrary._netAssetValue(liq);
        return usdToUsdc(toUint256(navUsd));
    }


    function _claimRewards(address _to) internal override returns (uint256){

        // claim rewards
        penProxy.claimStakingRewards();

        // sell rewards
        uint256 totalUsdc = 0;

        uint256 dystBalance = dyst.balanceOf(address(this));
        if (dystBalance > 0) {
            uint256 dystUsdc = DystopiaLibrary._swapExactTokensForTokens(
                dystRouter,
                address(dyst),
                address(wmatic),
                address(usdPlus),
                false,
                false,
                dystBalance,
                address(this)
            );
            totalUsdc += dystUsdc;
        }

        uint256 penBalance = penToken.balanceOf(address(this));
        if (penBalance > 0) {
            uint256 penUsdc = DystopiaLibrary._swapExactTokensForTokens(
                dystRouter,
                address(penToken),
                address(wmatic),
                address(usdPlus),
                false,
                false,
                penBalance,
                address(this)
            );
            totalUsdc += penUsdc;
        }

        return totalUsdc;
    }


    function _balance() internal override returns (uint256) {
        _updateEMode();
        calcDeltas(Method.NOTHING, 0);
        return realHealthFactor;
    }


    function currentHealthFactor() external view override returns (uint256){
        return realHealthFactor;
    }

    /**
     * Current price Usd+/Wmatic in dyst pool in USD/USD in e+2
     */
    function priceInDystUsdpMaticPool() internal view returns (uint256){
        // on another pools tokens order may be another and calc price in pool should changed
        // token 0 - wmatic
        // token 1 - usdPlus
        (uint256 reserveWmatic, uint256 reserveUsdPlus,) = dystVault.getReserves();
        uint256 reserveWmaticUsd = wmaticToUsd(reserveWmatic);
        uint256 reserveUsdPlusUsd = usdcToUsd(reserveUsdPlus);

        // console.log("----------------- priceInDystUsdpMaticPool()");
        // console.log("reserveWmatic       ", reserveWmatic);
        // console.log("reserveWmaticUsd    ", reserveWmaticUsd);
        // console.log("reserveUsdPlus      ", reserveUsdPlus);
        // console.log("reserveUsdPlusUsd   ", reserveUsdPlusUsd);
        // console.log("-----------------");
        // 10^8 because of 10^6 plus additional 2 digits to be comparable to USD price from oracles
        return reserveUsdPlusUsd * 10 ** 8 / reserveWmaticUsd;

    }


    function currentAmounts() public view returns (Amounts memory){

        (uint256 poolToken,  uint256 poolUsdPlus) = this._getLiquidity();

        (uint256 aaveCollateralUsd, uint256 aaveBorrowUsd,,,,) = aavePool().getUserAccountData(address(this));

        return Amounts(
            usdToUsdc(aaveCollateralUsd),
            usdToWmatic(aaveBorrowUsd),
            poolToken,
            poolUsdPlus,
            usdPlus.balanceOf(address(this)),
            usdc.balanceOf(address(this)),
            wmatic.balanceOf(address(this))
        );
    }

    /**
     * Get current liquidity in USD e6
     */
    function currentLiquidity() public view returns (Liquidity memory){

        // in pool liquidity
        (uint256 poolToken,  uint256 poolUsdPlus) = this._getLiquidity();
        uint256 poolTokenUsd = wmaticToUsd(poolToken);
        uint256 poolUsdPlusUsd = usdcToUsd(poolUsdPlus);

        // liquidity from AAVE E6+2
        (uint256 aaveCollateralUsd, uint256 aaveBorrowUsd,,,,) = aavePool().getUserAccountData(address(this));
        // convert to e6
        aaveCollateralUsd = aaveCollateralUsd / 100;
        aaveBorrowUsd = aaveBorrowUsd / 100;

        // free tokens on contract
        uint256 usdPlusBalanceUsd = usdcToUsd(usdPlus.balanceOf(address(this)));
        uint256 usdcBalanceUsd = usdcToUsd(usdc.balanceOf(address(this)));
        uint256 wmaticBalanceUsd = wmaticToUsd(wmatic.balanceOf(address(this)));


        console.log("----------------- currentLiquidity()");
        console.log("poolToken        ", poolToken);
        console.log("poolTokenUsd     ", poolTokenUsd);
        console.log("poolUsdPlus       ", poolUsdPlus);
        console.log("poolUsdPlusUsd    ", poolUsdPlusUsd);
        console.log("aaveCollateralUsd ", aaveCollateralUsd);
        console.log("aaveBorrowUsd     ", aaveBorrowUsd);
        console.log("wmaticBalanceUsd  ", wmaticBalanceUsd);
        console.log("usdPlusBalanceUsd ", usdPlusBalanceUsd);
        console.log("usdcBalanceUsd    ", usdcBalanceUsd);
        console.log("-----------------");

        //TODO: rename vars
        return Liquidity(
            toInt256(aaveCollateralUsd),
            toInt256(aaveBorrowUsd),
            toInt256(poolTokenUsd),
            toInt256(poolUsdPlusUsd),
            toInt256(usdPlusBalanceUsd),
            toInt256(usdcBalanceUsd),
            toInt256(wmaticBalanceUsd)
        );
    }

    function liquidityToActions(CalcContext2 memory calcContext2) view public returns (Action2[] memory, uint256){
        (Action[] memory actions, uint256 code) = EtsCalculationLibrary.liquidityToActions(calcContext2);
        Action2[] memory actions2 = new Action2[](actions.length);
        for(uint256 i=0; i < actions.length; i++) {
            actions2[i].amount = actions[i].amount;
            actions2[i].actionType = uint(actions[i].actionType);
        }
        return (actions2, code);
    }

    /**
     * @param amount  - USDC amount in e6
     */
    function calcDeltas(Method method, uint256 amount) internal {

        Liquidity memory liq = currentLiquidity();
        int256 K1 = toInt256(1e18 * healthFactor / liquidationThreshold);
        // price in e8 K2 should be in e18 so up by 1e10
        int256 K2 = toInt256(1e10 * priceInDystUsdpMaticPool());
        int256 retAmount;
        if (method == Method.UNSTAKE) {
            int256 navUsd = EtsCalculationLibrary._netAssetValue(liq);
            int256 amountUsd = toInt256(usdcToUsd(amount));
            require(navUsd >= amountUsd, "Not enough NAV for UNSTAKE");
            // for unstake make deficit as amount
            retAmount = - amountUsd;
        }

        (Action[] memory actions, uint256 code) = EtsCalculationLibrary.liquidityToActions(CalcContext2(K1, K2, retAmount, liq, wmaticUsdcSlippagePersent));

        runActions(actions);

        (,,,,, realHealthFactor) = aavePool().getUserAccountData(address(this));

    }

    function runActions(Action[] memory actions) internal  {

        console.log("--------- execute actions");
        for (uint j; j < actions.length; j++) {
            console.log(j, uint(actions[j].actionType), actions[j].amount);
            executeAction(actions[j]);
        }
        console.log("---------");

    }

    function executeAction(Action memory action) internal {
        if (action.actionType == ActionType.ADD_LIQUIDITY) {
            console.log("execute action ADD_LIQUIDITY");
            UsdPlusWmaticLibrary._addLiquidityToDystopia(this, action.amount);
        } else if (action.actionType == ActionType.REMOVE_LIQUIDITY) {
            console.log("execute action REMOVE_LIQUIDITY");
            UsdPlusWmaticLibrary._removeLiquidityFromDystopia(this, action.amount);
        } else if (action.actionType == ActionType.SWAP_USDPLUS_TO_ASSET) {
            console.log("execute action SWAP_USDPLUS_TO_ASSET");
            UsdPlusWmaticLibrary._swapUspPlusToUsdc(this, action.amount);
        } else if (action.actionType == ActionType.SWAP_ASSET_TO_USDPLUS) {
            console.log("execute action SWAP_ASSET_TO_USDPLUS");
            UsdPlusWmaticLibrary._swapUsdcToUsdPlus(this, action.amount);
        } else if (action.actionType == ActionType.SUPPLY_ASSET_TO_AAVE) {
            console.log("execute action SUPPLY_ASSET_TO_AAVE");
            UsdPlusWmaticLibrary._supplyUsdcToAave(this, action.amount);
        } else if (action.actionType == ActionType.WITHDRAW_ASSET_FROM_AAVE) {
            console.log("execute action WITHDRAW_ASSET_FROM_AAVE");
            UsdPlusWmaticLibrary._withdrawUsdcFromAave(this, action.amount);
        } else if (action.actionType == ActionType.BORROW_TOKEN_FROM_AAVE) {
            console.log("execute action BORROW_TOKEN_FROM_AAVE");
            UsdPlusWmaticLibrary._borrowTokenFromAave(this, action.amount);
        } else if (action.actionType == ActionType.REPAY_TOKEN_TO_AAVE) {
            console.log("execute action REPAY_TOKEN_TO_AAVE");
            UsdPlusWmaticLibrary._repayWmaticToAave(this, action.amount);
        } else if (action.actionType == ActionType.SWAP_TOKEN_TO_ASSET) {
            console.log("execute action SWAP_TOKEN_TO_ASSET");
            UsdPlusWmaticLibrary._swapWmaticToUsdc(this, action.amount, action.slippagePercent);
        } else if (action.actionType == ActionType.SWAP_ASSET_TO_TOKEN) {
            console.log("execute action SWAP_ASSET_TO_TOKEN");
            UsdPlusWmaticLibrary._swapUsdcToWmatic(this, action.amount, action.slippagePercent);
        }
    }

    function toInt256(uint256 value) internal pure returns (int256) {
        // Note: Unsafe cast below is okay because `type(int256).max` is guaranteed to be positive
        require(value <= uint256(type(int256).max), "SafeCast: value doesn't fit in an int256");
        return int256(value);
    }

    function toUint256(int256 value) internal pure returns (uint256) {
        require(value >= 0, "SafeCast: value must be positive");
        return uint256(value);
    }

    /**
 * Get USD equivalent in e6
 * @param amount WMATIC tokens amount
     */
    function wmaticToUsd(uint256 amount) public view returns (uint256){
        // X / 100 because converting return e6+2 as oracle price but need to remove additional +2
        return AaveBorrowLibrary.convertTokenAmountToUsd(
            amount,
            wmaticDm,
            uint256(oracleWmatic.latestAnswer())
        ) / 100;
    }

    /**
     * Get WMATIC equivalent from USD liquidity
     * @param liquidity USD liquidity in e6
     */
    function usdToWmatic(uint256 liquidity) public view returns (uint256){
        // liquidity * 100 => because need e6+2 for converting but liq in e6
        return AaveBorrowLibrary.convertUsdToTokenAmount(
            liquidity * 100,
            wmaticDm,
            uint256(oracleWmatic.latestAnswer())
        );
    }

    /**
     * Get USD equivalent in e6
     * @param amount USDC tokens amount
     */
    function usdcToUsd(uint256 amount) public view returns (uint256){
        // X / 100 because converting return e6+2 as oracle price but need to remove additional +2
        return AaveBorrowLibrary.convertTokenAmountToUsd(
            amount,
            usdcDm,
            uint256(oracleUsdc.latestAnswer())
        ) / 100;
    }

    /**
     * Get USDC equivalent from USD liquidity
     * @param liquidity USD liquidity in e6
     */
    function usdToUsdc(uint256 liquidity) public view returns (uint256){
        // liquidity * 100 => because need e6+2 for converting but liq in e6
        return AaveBorrowLibrary.convertUsdToTokenAmount(
            liquidity * 100,
            usdcDm,
            uint256(oracleUsdc.latestAnswer())
        );
    }

}
