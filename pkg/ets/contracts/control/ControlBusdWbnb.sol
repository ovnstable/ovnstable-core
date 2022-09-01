// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "@overnight-contracts/connectors/contracts/stuff/Cone.sol";
import "@overnight-contracts/common/contracts/libraries/AaveBorrowLibrary.sol";
import "@overnight-contracts/connectors/contracts/stuff/Venus.sol";
import "@overnight-contracts/connectors/contracts/stuff/Unknown.sol";


import "../StrategyBusdWbnb.sol";
import "../libraries/EtsCalculationLibrary.sol";
import "../core/IHedgeStrategy.sol";

contract ControlBusdWbnb is Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant STRATEGY_ROLE = keccak256("STRATEGY_ROLE");

    StrategyBusdWbnb public strategy;

    IERC20 public usdPlus;
    IERC20 public busd;
    IERC20 public wbnb;

    VenusInterface public vBusdToken;
    VenusInterface public vBnbToken;

    uint256 public busdDm;
    uint256 public wbnbDm;
    uint256 public bnbDm;

    IPriceFeed public oracleBusd;
    IPriceFeed public oracleWbnb;

    IConePair public conePair;
    IGauge public coneGauge;

    uint256 tokenAssetSlippagePercent;

    uint256 public liquidationThreshold;
    uint256 public healthFactor;

    IERC20 public unkwnToken;
    IUserProxy public unkwnUserProxy;
    IUnkwnLens public unkwnLens;


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override
    {}

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyStrategy() {
        require(hasRole(STRATEGY_ROLE, msg.sender), "Restricted to STRATEGY_ROLE");
        _;
    }

    function setStrategy(address payable _strategy ) external onlyStrategy{
        strategy = StrategyBusdWbnb(_strategy);

        usdPlus = strategy.usdPlus();
        busd = strategy.busd();
        wbnb = strategy.wbnb();

        vBnbToken = strategy.vBnbToken();
        vBusdToken = strategy.vBusdToken();

        busdDm = strategy.busdDm();
        wbnbDm = strategy.wbnbDm();
        bnbDm = strategy.bnbDm();

        oracleBusd = strategy.oracleBusd();
        oracleWbnb = strategy.oracleWbnb();

        conePair = strategy.conePair();
        coneGauge = strategy.coneGauge();

        tokenAssetSlippagePercent = strategy.tokenAssetSlippagePercent();
        liquidationThreshold = strategy.liquidationThreshold();
        healthFactor = strategy.healthFactor();

        unkwnToken = strategy.unkwnToken();
        unkwnUserProxy = strategy.unkwnUserProxy();
        unkwnLens = strategy.unkwnLens();
    }

    /**
      * @param amount  - USDC amount in e6
    */

    function calcDeltas(Method method, uint256 amount) external onlyStrategy{

        Liquidity memory liq = currentLiquidity();
        int256 K1 = toInt256(1e18 * healthFactor / liquidationThreshold);
        // price in e8 K2 should be in e18 so up by 1e10
        int256 K2 = toInt256(1e10 * _pricePool());
        int256 retAmount;
        if (method == Method.UNSTAKE) {
            int256 navUsd = EtsCalculationLibrary._netAssetValue(liq);
            int256 amountUsd = toInt256(busdToUsd(amount * 10 ** 12));
            require(navUsd >= amountUsd, "Not enough NAV for UNSTAKE");
            // for unstake make deficit as amount
            retAmount = - amountUsd;
        }

        (Action[] memory actions, uint256 code) = EtsCalculationLibrary.liquidityToActions(CalcContext2(K1, K2, retAmount, liq, tokenAssetSlippagePercent));

        runActions(actions);

        liq = currentLiquidity();
        uint256 realHealthFactor = toUint256(liq.collateralAsset) * liquidationThreshold / toUint256(liq.borrowToken);

        strategy.setRealHealthFactor(realHealthFactor);
    }

    function currentAmounts() public view returns (Amounts memory) {

        (uint256 poolToken,  uint256 poolUsdPlus) = _getLiquidity();

        uint256 aaveBorrowAmount = vBnbToken.borrowBalanceStored(address(strategy));
        uint256 aaveCollateralAmount = vBusdToken.balanceOf(address(strategy)) * vBusdToken.exchangeRateStored() / 1e18;

        return Amounts(
            aaveCollateralAmount,
            aaveBorrowAmount,
            poolToken,
            poolUsdPlus,
            usdPlus.balanceOf(address(strategy)),
            busd.balanceOf(address(strategy)),
            wbnb.balanceOf(address(strategy))
        );
    }


    function balances() external view returns (IHedgeStrategy.BalanceItem[] memory){

        Liquidity memory liq = currentLiquidity();
        Amounts memory amounts = currentAmounts();

        IHedgeStrategy.BalanceItem[] memory items = new IHedgeStrategy.BalanceItem[](7);
        items[0] = IHedgeStrategy.BalanceItem(address(wbnb), toUint256(liq.borrowToken), amounts.borrowToken, true);
        items[1] = IHedgeStrategy.BalanceItem(address(busd), toUint256(liq.collateralAsset), amounts.collateralAsset, false);
        items[2] = IHedgeStrategy.BalanceItem(address(wbnb), toUint256(liq.poolToken), amounts.poolToken, false);
        items[3] = IHedgeStrategy.BalanceItem(address(usdPlus), toUint256(liq.poolUsdPlus), amounts.poolUsdPlus, false);
        items[4] = IHedgeStrategy.BalanceItem(address(usdPlus), toUint256(liq.freeUsdPlus), amounts.freeUsdPlus, false);
        items[5] = IHedgeStrategy.BalanceItem(address(busd), toUint256(liq.freeAsset), amounts.freeAsset, false);
        items[6] = IHedgeStrategy.BalanceItem(address(wbnb), toUint256(liq.freeToken), amounts.freeToken, false);
        return items;
    }


    /**
     * Get current liquidity in USD e6
     */
    function currentLiquidity() public view returns (Liquidity memory){

        // in pool liquidity
        (uint256 poolToken,  uint256 poolBusd) = _getLiquidity();
        uint256 poolTokenUsd = wbnbToUsd(poolToken);
        uint256 poolBusdUsd = busdToUsd(poolBusd);

        // liquidity from AAVE E6+2
        uint256 aaveCollateralUsd = busdToUsd(vBusdToken.balanceOf(address(strategy)) * vBusdToken.exchangeRateStored() / 1e18);
        uint256 aaveBorrowUsd = wbnbToUsd(vBnbToken.borrowBalanceStored(address(strategy)));

        // free tokens on contract
        uint256 usdPlusBalanceUsd = busdToUsd(usdPlus.balanceOf(address(strategy)) * 10 ** 12);
        uint256 busdBalanceUsd = busdToUsd(busd.balanceOf(address(strategy)));
        uint256 wbnbBalanceUsd = wbnbToUsd(wbnb.balanceOf(address(strategy)));


        console.log("----------------- currentLiquidity()");
        console.log("poolToken        ", poolToken);
        console.log("poolTokenUsd     ", poolTokenUsd);
        console.log("poolBusd       ", poolBusd);
        console.log("poolBusdUsd    ", poolBusdUsd);
        console.log("aaveCollateralUsd ", aaveCollateralUsd);
        console.log("aaveBorrowUsd     ", aaveBorrowUsd);
        console.log("wbnbBalanceUsd     ", wbnbBalanceUsd);
        console.log("usdPlusBalanceUsd ", usdPlusBalanceUsd);
        console.log("busdBalanceUsd    ", busdBalanceUsd);
        console.log("-----------------");

        //TODO: rename vars
        return Liquidity(
            toInt256(aaveCollateralUsd),
            toInt256(aaveBorrowUsd),
            toInt256(poolTokenUsd),
            toInt256(poolBusdUsd),
            toInt256(usdPlusBalanceUsd),
            toInt256(busdBalanceUsd),
            toInt256(wbnbBalanceUsd)
        );
    }


    /**
      * NAV = sum of all tokens liquidity minus borrows.
      * @return NAV in USDC
      */
    function netAssetValue() external view returns (uint256){
        Liquidity memory liq = currentLiquidity();
        int256 navUsd = EtsCalculationLibrary._netAssetValue(liq);
        return usdToBusd(toUint256(navUsd)) / (10 ** 12);
    }


    // Current price Usd+/wbnb in cone pool in USD/USD in e+2

    function _pricePool() internal view returns (uint256){
        // on another pools tokens order may be another and calc price in pool should changed
        // token 0 - wbnb
        // token 1 - usdPlus
        (uint256 reserveWbnb, uint256 reserveBusd,) = conePair.getReserves();
        uint256 reserveWbnbUsd = wbnbToUsd(reserveWbnb);
        uint256 reserveBusdUsd = busdToUsd(reserveBusd);

        // console.log("----------------- priceInDystUsdpMaticPool()");
        // console.log("reserveWbnb       ", reserveWbnb);
        // console.log("reserveWbnbUsd    ", reserveWbnbUsd);
        // console.log("reserveUsdPlus      ", reserveUsdPlus);
        // console.log("reserveUsdPlusUsd   ", reserveUsdPlusUsd);
        // console.log("-----------------");
        // 10^8 because of 10^6 plus additional 2 digits to be comparable to USD price from oracles
        return reserveBusdUsd * 10 ** 8 / reserveWbnbUsd;
    }


    /**
     * Own liquidity in pool in their native digits. Used in strategy.
     */
    function _getLiquidity() internal view returns (uint256, uint256) {


        // uint256 balanceLp = coneGauge.balanceOf(address(strategy));
        // return _getLiquidityByLp(balanceLp);

        // address userProxyThis = unkwnLens.userProxyByAccount(address(this));
        // address stakingAddress = unkwnLens.stakingRewardsByConePool(address(conePair));
        // uint256 balanceLp = IERC20(stakingAddress).balanceOf(userProxyThis);
        uint256 balanceLp = UnknownLibrary.getUserLpBalance(unkwnLens, address(conePair), address(strategy));
        console.log("balanceLp", balanceLp);
        return _getLiquidityByLp(balanceLp);
    }

    function _getLiquidityByLp(uint256 balanceLp) internal view returns (uint256, uint256) {

        (uint256 reserve0Current, uint256 reserve1Current,) = conePair.getReserves();

        uint256 amountLiq0 = reserve0Current * balanceLp / conePair.totalSupply();
        uint256 amountLiq1 = reserve1Current * balanceLp / conePair.totalSupply();
        return (amountLiq0, amountLiq1);
    }


    function liquidityToActions(CalcContext2 memory calcContext2) view public returns (Action2[] memory, uint256){
        (Action[] memory actions, uint256 code) = EtsCalculationLibrary.liquidityToActions(calcContext2);
        Action2[] memory actions2 = new Action2[](actions.length);
        for (uint256 i = 0; i < actions.length; i++) {
            actions2[i].amount = actions[i].amount;
            actions2[i].actionType = uint(actions[i].actionType);
        }
        return (actions2, code);
    }

    function runActions(Action[] memory actions) internal {

        console.log("--------- execute actions");
        for (uint j; j < actions.length; j++) {
            console.log(j, uint(actions[j].actionType), actions[j].amount);
            strategy.executeAction(actions[j]);
        }
        console.log("---------");

    }

    /**
 * Get USD equivalent in e6
 * @param amount WMATIC tokens amount
     */

    function wbnbToUsd(uint256 amount) public view returns (uint256){
        // X / 100 because converting return e6+2 as oracle price but need to remove additional +2
        return AaveBorrowLibrary.convertTokenAmountToUsd(
            amount,
            bnbDm,
            uint256(oracleWbnb.latestAnswer())
        ) / 100;
    }

    /**
     * Get WMATIC equivalent from USD liquidity
     * @param liquidity USD liquidity in e6
     */
    function usdToWbnb(uint256 liquidity) public view returns (uint256){
        // liquidity * 100 => because need e6+2 for converting but liq in e6
        return AaveBorrowLibrary.convertUsdToTokenAmount(
            liquidity * 100,
            bnbDm,
            uint256(oracleWbnb.latestAnswer())
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

    function toUint256(int256 value) internal pure returns (uint256) {
        require(value >= 0, "SafeCast: value must be positive");
        return uint256(value);
    }

    function toInt256(uint256 value) internal pure returns (int256) {
        // Note: Unsafe cast below is okay because `type(int256).max` is guaranteed to be positive
        require(value <= uint256(type(int256).max), "SafeCast: value doesn't fit in an int256");
        return int256(value);
    }
}
