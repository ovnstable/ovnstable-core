// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "@overnight-contracts/common/contracts/libraries/AaveBorrowLibrary.sol";
import "@overnight-contracts/connectors/contracts/stuff/AaveV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Quickswap.sol";

import "../StrategyQsWmaticUsdc.sol";
import "../libraries/EtsCalculationLibrary.sol";
import "../core/IHedgeStrategy.sol";

import "hardhat/console.sol";

contract ControlQsWmaticUsdc is Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant STRATEGY_ROLE = keccak256("STRATEGY_ROLE");

    StrategyQsWmaticUsdc public strategy;

    IERC20 public usdPlus;
    IERC20 public wmatic;
    IERC20 public usdc;

    uint256 public wmaticDm;
    uint256 public usdcDm;

    IUniswapV2Pair public quickswapWmaticUsdc;

    IPoolAddressesProvider public aavePoolAddressesProvider;
    IPriceFeed public oracleWmatic;
    IPriceFeed public oracleUsdc;

    uint256 public tokenAssetSlippagePercent;
    uint256 public liquidationThreshold;
    uint256 public healthFactor;


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

    function setStrategy(address payable _strategy) external onlyStrategy{
        strategy = StrategyQsWmaticUsdc(_strategy);

        usdPlus = strategy.usdPlus();
        wmatic = strategy.wmatic();
        usdc = strategy.usdc();

        wmaticDm = strategy.wmaticDm();
        usdcDm = strategy.usdcDm();

        quickswapWmaticUsdc = strategy.quickswapWmaticUsdc();

        aavePoolAddressesProvider = strategy.aavePoolAddressesProvider();
        oracleWmatic = strategy.oracleWmatic();
        oracleUsdc = strategy.oracleUsdc();

        tokenAssetSlippagePercent = strategy.tokenAssetSlippagePercent();
        liquidationThreshold = strategy.liquidationThreshold();
        healthFactor = strategy.healthFactor();
    }

    function aavePool() public view returns (IPool) {
        return IPool(AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider)));
    }

    /**
      * @param amount - USDC amount in e6
    */
    function calcDeltas(Method method, uint256 amount) external onlyStrategy{

        Liquidity memory liq = currentLiquidity();
        int256 K1 = toInt256(1e18 * healthFactor / liquidationThreshold);
        // price in e8 K2 should be in e18 so up by 1e10
        int256 K2 = toInt256(1e10 * _pricePool());
        int256 retAmount;
        if (method == Method.UNSTAKE) {
            int256 navUsd = EtsCalculationLibrary._netAssetValue(liq);
            int256 amountUsd = toInt256(usdcToUsd(amount));
            require(navUsd >= amountUsd, "Not enough NAV for UNSTAKE");
            // for unstake make deficit as amount
            retAmount = - amountUsd;
        }

        (Action[] memory actions, uint256 code) = EtsCalculationLibrary.liquidityToActions(CalcContext2(K1, K2, retAmount, liq, tokenAssetSlippagePercent));

        _runActions(actions);

        (,,,,, uint256 realHealthFactor) = aavePool().getUserAccountData(address(strategy));
        strategy.setRealHealthFactor(realHealthFactor);
    }

    /**
     * Get current liquidity in USD e6
     */
    function currentLiquidity() public view returns (Liquidity memory) {

        // in pool liquidity
        (uint256 poolToken, uint256 poolUsdPlus) = _getLiquidity();
        uint256 poolTokenUsd = wmaticToUsd(poolToken);
        uint256 poolUsdPlusUsd = usdcToUsd(poolUsdPlus);

        // liquidity from AAVE E6+2
        (uint256 aaveCollateralUsd, uint256 aaveBorrowUsd,,,,) = aavePool().getUserAccountData(address(strategy));
        // convert to e6
        aaveCollateralUsd = aaveCollateralUsd / 100;
        aaveBorrowUsd = aaveBorrowUsd / 100;

        // free tokens on contract
        uint256 usdPlusBalanceUsd = usdcToUsd(usdPlus.balanceOf(address(strategy)));
        uint256 usdcBalanceUsd = usdcToUsd(usdc.balanceOf(address(strategy)));
        uint256 wmaticBalanceUsd = wmaticToUsd(wmatic.balanceOf(address(strategy)));


        console.log("----------------- currentLiquidity()");
        console.log("poolToken         ", poolToken);
        console.log("poolTokenUsd      ", poolTokenUsd);
        console.log("poolUsdPlus       ", poolUsdPlus);
        console.log("poolUsdPlusUsd    ", poolUsdPlusUsd);
        console.log("aaveCollateralUsd ", aaveCollateralUsd);
        console.log("aaveBorrowUsd     ", aaveBorrowUsd);
        console.log("usdPlusBalanceUsd ", usdPlusBalanceUsd);
        console.log("usdcBalanceUsd    ", usdcBalanceUsd);
        console.log("wmaticBalanceUsd  ", wmaticBalanceUsd);
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

    function currentAmounts() public view returns (Amounts memory) {

        (uint256 poolToken, uint256 poolUsdPlus) = _getLiquidity();

        (uint256 aaveCollateralUsd, uint256 aaveBorrowUsd,,,,) = aavePool().getUserAccountData(address(strategy));

        uint256 aaveBorrowAmount = AaveBorrowLibrary.convertUsdToTokenAmount(aaveBorrowUsd, wmaticDm, uint256(oracleWmatic.latestAnswer()));
        uint256 aaveCollateralAmount = AaveBorrowLibrary.convertUsdToTokenAmount(aaveCollateralUsd, usdcDm, uint256(oracleUsdc.latestAnswer()));

        return Amounts(
            aaveCollateralAmount,
            aaveBorrowAmount,
            poolToken,
            poolUsdPlus,
            usdPlus.balanceOf(address(strategy)),
            usdc.balanceOf(address(strategy)),
            wmatic.balanceOf(address(strategy))
        );
    }

    function balances() external view returns (IHedgeStrategy.BalanceItem[] memory) {

        Liquidity memory liq = currentLiquidity();
        Amounts memory amounts = currentAmounts();

        IHedgeStrategy.BalanceItem[] memory items = new IHedgeStrategy.BalanceItem[](7);
        items[0] = IHedgeStrategy.BalanceItem(address(wmatic), toUint256(liq.borrowToken), amounts.borrowToken, true);
        items[1] = IHedgeStrategy.BalanceItem(address(usdc), toUint256(liq.collateralAsset), amounts.collateralAsset, false);
        items[2] = IHedgeStrategy.BalanceItem(address(wmatic), toUint256(liq.poolToken), amounts.poolToken, false);
        items[3] = IHedgeStrategy.BalanceItem(address(usdc), toUint256(liq.poolUsdPlus), amounts.poolUsdPlus, false);
        items[4] = IHedgeStrategy.BalanceItem(address(usdPlus), toUint256(liq.freeUsdPlus), amounts.freeUsdPlus, false);
        items[5] = IHedgeStrategy.BalanceItem(address(usdc), toUint256(liq.freeAsset), amounts.freeAsset, false);
        items[6] = IHedgeStrategy.BalanceItem(address(wmatic), toUint256(liq.freeToken), amounts.freeToken, false);
        return items;
    }

    /**
      * NAV = sum of all tokens liquidity minus borrows.
      * @return NAV in USDC
      */
    function netAssetValue() external view returns (uint256){
        Liquidity memory liq = currentLiquidity();
        int256 navUsd = EtsCalculationLibrary._netAssetValue(liq);
        return usdToUsdc(toUint256(navUsd));
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

    /**
     * Own liquidity in pool in their native digits. Used in strategy.
     */
    function _getLiquidity() internal view returns (uint256 wmaticBalance, uint256 usdcBalance) {
        uint256 lpTokenBalance = strategy.stakingDualRewards().balanceOf(address(strategy));
        uint256 totalLpBalance = quickswapWmaticUsdc.totalSupply();
        (uint256 reserveWmatic, uint256 reserveUsdc,) = quickswapWmaticUsdc.getReserves();
        wmaticBalance = reserveWmatic * lpTokenBalance / totalLpBalance;
        usdcBalance = reserveUsdc * lpTokenBalance / totalLpBalance;
    }

    // Current price wmatic/usdc in mesh pool in USD/USD in e+2
    function _pricePool() internal view returns (uint256){
        // on another pools tokens order may be another and calc price in pool should changed
        // token 0 - wmatic
        // token 1 - usdc
        (uint256 reserveWmatic, uint256 reserveUsdc,) = quickswapWmaticUsdc.getReserves();
        uint256 reserveWmaticUsd = wmaticToUsd(reserveWmatic);
        uint256 reserveUsdcUsd = usdcToUsd(reserveUsdc);

        console.log("----------------- priceInDystUsdpMaticPool()");
        console.log("reserveWmatic       ", reserveWmatic);
        console.log("reserveWmaticUsd    ", reserveWmaticUsd);
        console.log("reserveUsdc         ", reserveUsdc);
        console.log("reserveUsdcUsd      ", reserveUsdcUsd);
        console.log("-----------------");
        // 10^8 because of 10^6 plus additional 2 digits to be comparable to USD price from oracles
        return reserveUsdcUsd * 10 ** 8 / reserveWmaticUsd;
    }

    function _runActions(Action[] memory actions) internal {
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
