// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "@overnight-contracts/connectors/contracts/stuff/Cone.sol";
import "@overnight-contracts/connectors/contracts/stuff/AaveV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Venus.sol";
import "@overnight-contracts/connectors/contracts/stuff/Dodo.sol";

import "@overnight-contracts/common/contracts/libraries/WadRayMath.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/common/contracts/libraries/AaveBorrowLibrary.sol";

import "@overnight-contracts/core/contracts/interfaces/IExchange.sol";

import "./libraries/UsdPlusWbnbLibrary.sol";
import "./libraries/EtsCalculationLibrary.sol";
import "./core/HedgeStrategy.sol";

import "hardhat/console.sol";

contract StrategyUsdPlusWbnb is HedgeStrategy {
    using WadRayMath for uint256;
    using UsdPlusWbnbLibrary for StrategyUsdPlusWbnb;

    uint256 public constant MAX_UINT_VALUE = type(uint256).max;

    IERC20 public usdPlus;
    IERC20 public busd; //0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56
    IERC20 public wbnb; //0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c
    VenusInterface public vBusdToken; //0x95c78222B3D6e262426483D42CfA53685A67Ab9D
    VenusInterface public vBnbToken; //0xA07c5b74C9B40447a954e1466938b865b6BBea36
    uint256 public busdDm;
    uint256 public wbnbDm;
    uint256 public bnbDm;
    IPriceFeed public oracleBusd;
    IPriceFeed public oracleBnb;

    IConeRouter01 public coneRouter;
    IConePair public conePair;

    IExchange public exchange;

    IDODOProxy public dodoProxy;

    struct SetupParams {
        address usdPlus;
        address busd;
        address wbnb;
        address vBusdToken;
        address vBnbToken;
        address oracleBusd;
        address oracleBnb;
        address coneRouter;
        address conePair;
        address exchange;
        address dodoProxy;
    }



    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }

    // --- setters

    function setParams(SetupParams calldata params) external onlyAdmin {
        usdPlus = IERC20(params.usdPlus);
        busd = IERC20(params.busd);
        wbnb = IERC20(params.wbnb);
        vBusdToken = VenusInterface(params.vBusdToken);
        vBnbToken = VenusInterface(params.vBnbToken);
        busdDm = 10 ** IERC20Metadata(params.busd).decimals();
        wbnbDm = 10 ** IERC20Metadata(params.wbnb).decimals();
        bnbDm = 10 ** 8;
        oracleBusd = IPriceFeed(params.oracleBusd);
        oracleBnb = IPriceFeed(params.oracleBnb);

        setAsset(params.usdPlus);

        coneRouter = IConeRouter01(params.coneRouter);
        conePair = IConePair(params.conePair);

        exchange = IExchange(params.exchange);

        dodoProxy = IDODOProxy(params.dodoProxy);

        usdPlus.approve(address(coneRouter), type(uint256).max);
        wbnb.approve(address(coneRouter), type(uint256).max);
        conePair.approve(address(coneRouter), type(uint256).max);

        usdPlus.approve(address(exchange), type(uint256).max);
        busd.approve(address(exchange), type(uint256).max);
    }

    // --- logic

    function _stake(uint256 _amount) internal override {
        EtsCalculationLibrary.test();

        console.log('Swap');
        showBalance();
        UsdPlusWbnbLibrary._swapUspPlusToBusd(this, _amount / 2);

        console.log('Stake');
        showBalance();

        UsdPlusWbnbLibrary._addLiquidity(this, 1);

        console.log('Unstake');
        showBalance();

        UsdPlusWbnbLibrary._removeLiquidity(this, 1);

        // _updateEMode();
        // calcDeltas(Method.STAKE, _amount);
    }

    function showBalance()internal {
        console.log('WBNBN %s', wbnb.balanceOf(address(this)));
        console.log('USD+  %s', usdPlus.balanceOf(address(this)));
        console.log('BUSD  %s', busd.balanceOf(address(this)));
        console.log('LP    %s', conePair.balanceOf(address(this)));
    }


    function _unstake(
        uint256 _amount
    ) internal override returns (uint256) {
        // _updateEMode();
        // calcDeltas(Method.UNSTAKE, _amount);
        return _amount;
    }

    function balances() external view override returns (BalanceItem[] memory){

        //Liquidity memory liq = currentLiquidity();
        //Amounts memory amounts = currentAmounts();

        BalanceItem[] memory items = new BalanceItem[](7);
        // items[0] = BalanceItem(address(wmatic), toUint256(liq.borrowToken), amounts.borrowToken, true);
        // items[1] = BalanceItem(address(usdc), toUint256(liq.collateralAsset), amounts.collateralAsset, false);
        // items[2] = BalanceItem(address(wmatic), toUint256(liq.poolToken), amounts.poolToken, false);
        // items[3] = BalanceItem(address(usdPlus), toUint256(liq.poolUsdPlus), amounts.poolUsdPlus, false);
        // items[4] = BalanceItem(address(usdPlus), toUint256(liq.freeUsdPlus), amounts.freeUsdPlus, false);
        // items[5] = BalanceItem(address(usdc), toUint256(liq.freeAsset), amounts.freeAsset, false);
        // items[6] = BalanceItem(address(wmatic), toUint256(liq.freeToken), amounts.freeToken, false);
        return items;
    }


    /**
     * NAV = sum of all tokens liquidity minus borrows.
     * @return NAV in USDC
     */
    function netAssetValue() external view override returns (uint256){
        // Liquidity memory liq = currentLiquidity();
        // int256 navUsd = EtsCalculationLibrary._netAssetValue(liq);
        // return usdToUsdc(toUint256(navUsd));
        return 0;
    }


    function _claimRewards(address _to) internal override returns (uint256){

        // // claim rewards
        // penProxy.claimStakingRewards();

        // // sell rewards
        // uint256 totalUsdc = 0;

        // uint256 dystBalance = dyst.balanceOf(address(this));
        // if (dystBalance > 0) {
        //     uint256 dystUsdc = DystopiaLibrary._swapExactTokensForTokens(
        //         dystRouter,
        //         address(dyst),
        //         address(wmatic),
        //         address(usdPlus),
        //         false,
        //         false,
        //         dystBalance,
        //         address(this)
        //     );
        //     totalUsdc += dystUsdc;
        // }

        // uint256 penBalance = penToken.balanceOf(address(this));
        // if (penBalance > 0) {
        //     uint256 penUsdc = DystopiaLibrary._swapExactTokensForTokens(
        //         dystRouter,
        //         address(penToken),
        //         address(wmatic),
        //         address(usdPlus),
        //         false,
        //         false,
        //         penBalance,
        //         address(this)
        //     );
        //     totalUsdc += penUsdc;
        // }

        // return totalUsdc;
        return 0;
    }


    function _balance() internal override returns (uint256) {
        // _updateEMode();
        // calcDeltas(Method.NOTHING, 0);
        //return realHealthFactor;
        return 0;
    }


    function currentHealthFactor() external view override returns (uint256){
        //return realHealthFactor;
        return 0;
    }

    /**
     * Current price Usd+/Wmatic in dyst pool in USD/USD in e+2
     */
    // function priceInDystUsdpMaticPool() internal view returns (uint256){
    //     // on another pools tokens order may be another and calc price in pool should changed
    //     // token 0 - wmatic
    //     // token 1 - usdPlus
    //     (uint256 reserveWmatic, uint256 reserveUsdPlus,) = dystVault.getReserves();
    //     uint256 reserveWmaticUsd = wmaticToUsd(reserveWmatic);
    //     uint256 reserveUsdPlusUsd = usdcToUsd(reserveUsdPlus);

    //     // console.log("----------------- priceInDystUsdpMaticPool()");
    //     // console.log("reserveWmatic       ", reserveWmatic);
    //     // console.log("reserveWmaticUsd    ", reserveWmaticUsd);
    //     // console.log("reserveUsdPlus      ", reserveUsdPlus);
    //     // console.log("reserveUsdPlusUsd   ", reserveUsdPlusUsd);
    //     // console.log("-----------------");
    //     // 10^8 because of 10^6 plus additional 2 digits to be comparable to USD price from oracles
    //     return reserveUsdPlusUsd * 10 ** 8 / reserveWmaticUsd;

    // }


    // function currentAmounts() public view returns (Amounts memory){

    //     (uint256 poolToken,  uint256 poolUsdPlus) = this._getLiquidity();

    //     (uint256 aaveCollateralUsd, uint256 aaveBorrowUsd,,,,) = aavePool().getUserAccountData(address(this));

    //     uint256 aaveBorrowAmount = AaveBorrowLibrary.convertUsdToTokenAmount(aaveBorrowUsd, wmaticDm, uint256(oracleWmatic.latestAnswer()));
    //     uint256 aaveCollateralAmount = AaveBorrowLibrary.convertUsdToTokenAmount(aaveCollateralUsd, usdcDm, uint256(oracleUsdc.latestAnswer()));

    //     return Amounts(
    //         aaveCollateralAmount,
    //         aaveBorrowAmount,
    //         poolToken,
    //         poolUsdPlus,
    //         usdPlus.balanceOf(address(this)),
    //         usdc.balanceOf(address(this)),
    //         wmatic.balanceOf(address(this))
    //     );
    // }

    /**
     * Get current liquidity in USD e6
     */
    function currentLiquidity() public view returns (Liquidity memory){

        // in pool liquidity
        (uint256 poolToken,  uint256 poolUsdPlus) = this._getLiquidity();
        uint256 poolTokenUsd = 0;//wmaticToUsd(poolToken);
        uint256 poolUsdPlusUsd = 0;//usdcToUsd(poolUsdPlus);

        // liquidity from AAVE E6+2
        uint256 aaveCollateralUsd = busdToUsd(vBusdToken.balanceOf(address(this)) * vBusdToken.exchangeRateStored() / 1e30);
        uint256 aaveBorrowUsd = bnbToUsd(vBnbToken.borrowBalanceStored(address(this)));
        //(uint256 aaveCollateralUsd, uint256 aaveBorrowUsd,,,,) = aavePool().getUserAccountData(address(this));
        // convert to e6
        aaveCollateralUsd = aaveCollateralUsd / 100;
        aaveBorrowUsd = aaveBorrowUsd / 100;

        // free tokens on contract
        uint256 usdPlusBalanceUsd = busdToUsd(usdPlus.balanceOf(address(this)));
        uint256 busdBalanceUsd = busdToUsd(busd.balanceOf(address(this)));
        uint256 bnbBalanceUsd = bnbToUsd(wbnb.balanceOf(address(this)));


        console.log("----------------- currentLiquidity()");
        console.log("poolToken        ", poolToken);
        console.log("poolTokenUsd     ", poolTokenUsd);
        console.log("poolUsdPlus       ", poolUsdPlus);
        console.log("poolUsdPlusUsd    ", poolUsdPlusUsd);
        console.log("aaveCollateralUsd ", aaveCollateralUsd);
        console.log("aaveBorrowUsd     ", aaveBorrowUsd);
        console.log("bnbBalanceUsd     ", bnbBalanceUsd);
        console.log("usdPlusBalanceUsd ", usdPlusBalanceUsd);
        console.log("busdBalanceUsd    ", busdBalanceUsd);
        console.log("-----------------");

        //TODO: rename vars
        return Liquidity(
            toInt256(aaveCollateralUsd),
            toInt256(aaveBorrowUsd),
            toInt256(poolTokenUsd),
            toInt256(poolUsdPlusUsd),
            toInt256(usdPlusBalanceUsd),
            toInt256(busdBalanceUsd),
            toInt256(bnbBalanceUsd)
        );
    }

    // function liquidityToActions(CalcContext2 memory calcContext2) view public returns (Action2[] memory, uint256){
    //     (Action[] memory actions, uint256 code) = EtsCalculationLibrary.liquidityToActions(calcContext2);
    //     Action2[] memory actions2 = new Action2[](actions.length);
    //     for(uint256 i=0; i < actions.length; i++) {
    //         actions2[i].amount = actions[i].amount;
    //         actions2[i].actionType = uint(actions[i].actionType);
    //     }
    //     return (actions2, code);
    // }

    // /**
    //  * @param amount  - USDC amount in e6
    //  */
    // function calcDeltas(Method method, uint256 amount) internal {

    //     Liquidity memory liq = currentLiquidity();
    //     int256 K1 = toInt256(1e18 * healthFactor / liquidationThreshold);
    //     // price in e8 K2 should be in e18 so up by 1e10
    //     int256 K2 = toInt256(1e10 * priceInDystUsdpMaticPool());
    //     int256 retAmount;
    //     if (method == Method.UNSTAKE) {
    //         int256 navUsd = EtsCalculationLibrary._netAssetValue(liq);
    //         int256 amountUsd = toInt256(usdcToUsd(amount));
    //         require(navUsd >= amountUsd, "Not enough NAV for UNSTAKE");
    //         // for unstake make deficit as amount
    //         retAmount = - amountUsd;
    //     }

    //     (Action[] memory actions, uint256 code) = EtsCalculationLibrary.liquidityToActions(CalcContext2(K1, K2, retAmount, liq, wmaticUsdcSlippagePersent));

    //     runActions(actions);

    //     (,,,,, realHealthFactor) = aavePool().getUserAccountData(address(this));

    // }

    // function runActions(Action[] memory actions) internal  {

    //     console.log("--------- execute actions");
    //     for (uint j; j < actions.length; j++) {
    //         console.log(j, uint(actions[j].actionType), actions[j].amount);
    //         executeAction(actions[j]);
    //     }
    //     console.log("---------");

    // }

    // function executeAction(Action memory action) internal {
    //     if (action.actionType == ActionType.ADD_LIQUIDITY) {
    //         console.log("execute action ADD_LIQUIDITY");
    //         UsdPlusWmaticLibrary._addLiquidityToDystopia(this, action.amount);
    //     } else if (action.actionType == ActionType.REMOVE_LIQUIDITY) {
    //         console.log("execute action REMOVE_LIQUIDITY");
    //         UsdPlusWmaticLibrary._removeLiquidityFromDystopia(this, action.amount);
    //     } else if (action.actionType == ActionType.SWAP_USDPLUS_TO_ASSET) {
    //         console.log("execute action SWAP_USDPLUS_TO_ASSET");
    //         UsdPlusWmaticLibrary._swapUspPlusToUsdc(this, action.amount);
    //     } else if (action.actionType == ActionType.SWAP_ASSET_TO_USDPLUS) {
    //         console.log("execute action SWAP_ASSET_TO_USDPLUS");
    //         UsdPlusWmaticLibrary._swapUsdcToUsdPlus(this, action.amount);
    //     } else if (action.actionType == ActionType.SUPPLY_ASSET_TO_AAVE) {
    //         console.log("execute action SUPPLY_ASSET_TO_AAVE");
    //         UsdPlusWmaticLibrary._supplyUsdcToAave(this, action.amount);
    //     } else if (action.actionType == ActionType.WITHDRAW_ASSET_FROM_AAVE) {
    //         console.log("execute action WITHDRAW_ASSET_FROM_AAVE");
    //         UsdPlusWmaticLibrary._withdrawUsdcFromAave(this, action.amount);
    //     } else if (action.actionType == ActionType.BORROW_TOKEN_FROM_AAVE) {
    //         console.log("execute action BORROW_TOKEN_FROM_AAVE");
    //         UsdPlusWmaticLibrary._borrowTokenFromAave(this, action.amount);
    //     } else if (action.actionType == ActionType.REPAY_TOKEN_TO_AAVE) {
    //         console.log("execute action REPAY_TOKEN_TO_AAVE");
    //         UsdPlusWmaticLibrary._repayWmaticToAave(this, action.amount);
    //     } else if (action.actionType == ActionType.SWAP_TOKEN_TO_ASSET) {
    //         console.log("execute action SWAP_TOKEN_TO_ASSET");
    //         UsdPlusWmaticLibrary._swapWmaticToUsdc(this, action.amount, action.slippagePercent);
    //     } else if (action.actionType == ActionType.SWAP_ASSET_TO_TOKEN) {
    //         console.log("execute action SWAP_ASSET_TO_TOKEN");
    //         UsdPlusWmaticLibrary._swapUsdcToWmatic(this, action.amount, action.slippagePercent);
    //     }
    // }

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
    function bnbToUsd(uint256 amount) public view returns (uint256){
        // X / 100 because converting return e6+2 as oracle price but need to remove additional +2
        return AaveBorrowLibrary.convertTokenAmountToUsd(
            amount,
            bnbDm,
            uint256(oracleBnb.latestAnswer())
        ) / 100;
    }

    /**
     * Get WMATIC equivalent from USD liquidity
     * @param liquidity USD liquidity in e6
     */
    function usdToBnb(uint256 liquidity) public view returns (uint256){
        // liquidity * 100 => because need e6+2 for converting but liq in e6
        return AaveBorrowLibrary.convertUsdToTokenAmount(
            liquidity * 100,
            bnbDm,
            uint256(oracleBnb.latestAnswer())
        );
    }

    /**
     * Get USD equivalent in e6
     * @param amount USDC tokens amount
     */
    function busdToUsd(uint256 amount) public view returns (uint256){
        // X / 100 because converting return e6+2 as oracle price but need to remove additional +2
        return AaveBorrowLibrary.convertTokenAmountToUsd(
            amount,
            busdDm,
            uint256(oracleBusd.latestAnswer())
        ) / 100;
    }

    /**
     * Get USDC equivalent from USD liquidity
     * @param liquidity USD liquidity in e6
     */
    function usdToBusd(uint256 liquidity) public view returns (uint256){
        // liquidity * 100 => because need e6+2 for converting but liq in e6
        return AaveBorrowLibrary.convertUsdToTokenAmount(
            liquidity * 100,
            busdDm,
            uint256(oracleBusd.latestAnswer())
        );
    }

}
