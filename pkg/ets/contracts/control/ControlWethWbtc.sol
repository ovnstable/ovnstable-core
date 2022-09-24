// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "@overnight-contracts/common/contracts/libraries/AaveBorrowLibrary.sol";
import "@overnight-contracts/connectors/contracts/stuff/AaveV3.sol";

import "../StrategyWethWbtc.sol";
import "../libraries/EtsCalculationLibrary2.sol";
import "../core/IHedgeStrategy.sol";

import "hardhat/console.sol";

contract ControlWethWbtc is Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    using TickMath for int24;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant STRATEGY_ROLE = keccak256("STRATEGY_ROLE");

    StrategyWethWbtc public strategy;

    IERC20 public weth;
    IERC20 public wbtc;

    uint256 public wethDm;
    uint256 public wbtcDm;

    IUniswapV3Pool public pool;
    INonfungiblePositionManager public nonfungiblePositionManager;

    IPoolAddressesProvider public aavePoolAddressesProvider;
    IPriceFeed public oracleWeth;
    IPriceFeed public oracleWbtc;

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
        strategy = StrategyWethWbtc(_strategy);

        weth = strategy.weth();
        wbtc = strategy.wbtc();

        wethDm = strategy.wethDm();
        wbtcDm = strategy.wbtcDm();

        aavePoolAddressesProvider = strategy.aavePoolAddressesProvider();
        oracleWeth = strategy.oracleWeth();
        oracleWbtc = strategy.oracleWbtc();

        tokenAssetSlippagePercent = strategy.tokenAssetSlippagePercent();
        liquidationThreshold = strategy.liquidationThreshold();
        healthFactor = strategy.healthFactor();

        pool = strategy.pool();
        nonfungiblePositionManager = strategy.nonfungiblePositionManager();
    }

    function aavePool() public view returns (IPool) {
        return IPool(AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider)));
    }

    /**
      * @param amount - USDC amount in e6
    */
    function calcDeltas(Method method, uint256 amount) external onlyStrategy{

        Liquidity memory liq = currentLiquidity();
        console.log("healthFactor", healthFactor);
        console.log("liquidationThreshold", liquidationThreshold);
        int256 K1 = toInt256(1e18 * healthFactor / liquidationThreshold);
        // price in e8 K2 should be in e18 so up by 1e10
        int256 K2 = toInt256(1e10 * _pricePool());
        int256 retAmount;
        if (method == Method.UNSTAKE) {
            int256 navUsd = EtsCalculationLibrary2._netAssetValue(liq);
            console.log("navUsd", uint256(navUsd));
            int256 amountUsd = toInt256(wbtcToUsd(amount));
            console.log("amountUsd", uint256(amountUsd));
            require(navUsd >= amountUsd, "Not enough NAV for UNSTAKE");
            // for unstake make deficit as amount
            retAmount = - amountUsd;
        }

        (Action[] memory actions, uint256 code) = EtsCalculationLibrary2.liquidityToActions(CalcContext2(K1, K2, retAmount, liq, tokenAssetSlippagePercent));

        _runActions(actions);

        (,,,uint256 kt,, uint256 realHealthFactor) = aavePool().getUserAccountData(address(strategy));
        console.log("kt", kt);
        strategy.setRealHealthFactor(realHealthFactor);
    }

    /**
     * Get current liquidity in USD e6
     */
    function currentLiquidity() public view returns (Liquidity memory) {

        console.log("currentLiquidity");

        // in pool liquidity
        (uint256 poolToken, uint256 poolWbtc) = _getLiquidity();
        uint256 poolTokenUsd = wethToUsd(poolToken);
        uint256 poolWbtcUsd = wbtcToUsd(poolWbtc);

        // liquidity from AAVE E6+2
        (uint256 aaveCollateralUsd, uint256 aaveBorrowUsd,,,,) = aavePool().getUserAccountData(address(strategy));
        // convert to e6
        aaveCollateralUsd = aaveCollateralUsd / 100;
        aaveBorrowUsd = aaveBorrowUsd / 100;

        // free tokens on contract
        uint256 wbtcBalanceUsd = wbtcToUsd(wbtc.balanceOf(address(strategy)));
        uint256 wethBalanceUsd = wethToUsd(weth.balanceOf(address(strategy)));
        console.log("wbtcBalance", wbtc.balanceOf(address(strategy)));

        console.log("----------------- currentLiquidity()");
        console.log("poolToken         ", poolToken);
        console.log("poolTokenUsd      ", poolTokenUsd);
        console.log("poolWbtc          ", poolWbtc);
        console.log("poolWbtcUsd       ", poolWbtcUsd);
        console.log("aaveCollateralUsd ", aaveCollateralUsd);
        console.log("aaveBorrowUsd     ", aaveBorrowUsd);
        console.log("wbtcBalanceUsd    ", wbtcBalanceUsd);
        console.log("wethBalanceUsd    ", wethBalanceUsd);
        console.log("-----------------");

        //TODO: rename vars
        return Liquidity(
            toInt256(aaveCollateralUsd),
            toInt256(aaveBorrowUsd),
            toInt256(poolTokenUsd),
            toInt256(poolWbtcUsd),
            toInt256(wbtcBalanceUsd),
            toInt256(wethBalanceUsd)
        );
    }

    function currentAmounts() public view returns (Amounts memory) {

        console.log("currentAmounts");

        (uint256 poolToken, uint256 poolWbtc) = _getLiquidity();
        console.log("1");
        (uint256 aaveCollateralUsd, uint256 aaveBorrowUsd,,,,) = aavePool().getUserAccountData(address(strategy));
        console.log("2");
        uint256 aaveBorrowAmount = AaveBorrowLibrary.convertUsdToTokenAmount(aaveBorrowUsd, wethDm, uint256(oracleWeth.latestAnswer()));
        console.log("3");
        uint256 aaveCollateralAmount = AaveBorrowLibrary.convertUsdToTokenAmount(aaveCollateralUsd, wbtcDm, uint256(oracleWbtc.latestAnswer()));
        console.log("4");
        return Amounts(
            aaveCollateralAmount,
            aaveBorrowAmount,
            poolToken,
            poolWbtc,
            wbtc.balanceOf(address(strategy)),
            weth.balanceOf(address(strategy))
        );
    }

    function balances() external view returns (IHedgeStrategy.BalanceItem[] memory) {

        Liquidity memory liq = currentLiquidity();
        Amounts memory amounts = currentAmounts();

        IHedgeStrategy.BalanceItem[] memory items = new IHedgeStrategy.BalanceItem[](6);
        items[0] = IHedgeStrategy.BalanceItem(address(weth), toUint256(liq.borrowToken), amounts.borrowToken, true);
        items[1] = IHedgeStrategy.BalanceItem(address(wbtc), toUint256(liq.collateralAsset), amounts.collateralAsset, false);
        items[2] = IHedgeStrategy.BalanceItem(address(weth), toUint256(liq.poolToken), amounts.poolToken, false);
        items[3] = IHedgeStrategy.BalanceItem(address(wbtc), toUint256(liq.poolWbtc), amounts.poolWbtc, false);
        items[4] = IHedgeStrategy.BalanceItem(address(wbtc), toUint256(liq.freeWbtc), amounts.freeWbtc, false);
        items[5] = IHedgeStrategy.BalanceItem(address(weth), toUint256(liq.freeToken), amounts.freeToken, false);
        return items;
    }

    /**
      * NAV = sum of all tokens liquidity minus borrows.
      * @return NAV in USDC
      */
    function netAssetValue() external view returns (uint256){
        Liquidity memory liq = currentLiquidity();
        int256 navUsd = EtsCalculationLibrary2._netAssetValue(liq);
        console.log("navUsd", uint256(navUsd));
        return usdToWbtc(toUint256(navUsd));
    }

    function liquidityToActions(CalcContext2 memory calcContext2) view public returns (Action2[] memory, uint256){
        (Action[] memory actions, uint256 code) = EtsCalculationLibrary2.liquidityToActions(calcContext2);
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
    function _getLiquidity() internal view returns (uint256 wethBalance, uint256 wbtcBalance) {

        (uint160 sqrtRatioX96, int24 tick, , , , , ) = pool.slot0();
        console.log("sqrtRatioX96", sqrtRatioX96);
        console.log("tick", uint24(-tick));
        uint128 liquidity = 0;
        if (strategy.tokenId() != 0) {
            (,,,,,,,liquidity,,,,) = nonfungiblePositionManager.positions(strategy.tokenId());
        }
        console.log("liquidity1", liquidity);

        // compute current holdings from liquidity
        (wethBalance, wbtcBalance) = LiquidityAmounts
            .getAmountsForLiquidity(
            sqrtRatioX96,
            strategy.lowerTick().getSqrtRatioAtTick(),
            strategy.upperTick().getSqrtRatioAtTick(),
            liquidity
        );
        console.log("liquidity2");
    }

    function getPriceBySqrtRatio(uint160 sqrtRatio) public returns (uint256) {
        uint256 price = FullMath.mulDiv(uint256(sqrtRatio) * 10**10, uint256(sqrtRatio) * 10**8, 2 ** (96+96));
        return price;
    }

    function getPriceByTick(int24 tick) public returns (uint256) {
        uint160 sqrtRatio = TickMath.getSqrtRatioAtTick(tick);
        console.log("sqrtRatio11", sqrtRatio);
        uint256 price = FullMath.mulDiv(uint256(sqrtRatio) * 10**10, uint256(sqrtRatio) * 10**8, 2 ** (96+96));
        console.log("price11", price);
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

    function getPoolPrice(int24 lowerTick, int24 upperTick, uint160 sqrtRatio) public returns (uint256) {
        uint256 sa = sqrt(getPriceByTick(lowerTick));
        uint256 sb = sqrt(getPriceByTick(upperTick));
        uint256 sp = sqrt(getPriceBySqrtRatio(sqrtRatio));
        console.log("sa", sa);
        console.log("sb", sb);
        console.log("sp", sp);
        uint256 result = (sp * sb * (sp - sa)) / (sb - sp);
        return result;
    }

    function getPoolAnotherPrice(int24 lowerTick, int24 upperTick, uint160 sqrtRatio) public returns (uint256) {
        uint256 sa = sqrt(getPriceByTick(lowerTick));
        uint256 sb = sqrt(getPriceByTick(upperTick));
        uint256 sp = sqrt(getPriceBySqrtRatio(sqrtRatio));
        
        uint256 result = ((sb - sp)*10**26) / (sp * sb * (sp - sa));
        return result;
    }

    // Current price weth/wbtc in mesh pool in USD/USD in e+2
    function _pricePool() internal returns (uint256){
        (uint160 sqrtRatioX96,,,,,,) = pool.slot0();
        uint256 price = getPoolPrice(strategy.lowerTick(), strategy.upperTick(), sqrtRatioX96);
        uint256 anotherprice = getPoolAnotherPrice(strategy.lowerTick(), strategy.upperTick(), sqrtRatioX96);
        console.log("prise!0", price);
        console.log("prise!1", anotherprice);

        uint256 price1usd = wbtcToUsd(price);
        uint256 price1usdD = wbtcToUsd(100000000);
        uint256 price2usd = wethToUsd(anotherprice);
        uint256 price2usdD = wethToUsd(1000000000000000000);
        console.log("price1usd", price1usd);
        console.log("price1usdD", price1usdD);
        console.log("price2usd", price2usd);
        console.log("price2usdD", price2usdD);

        uint256 price1frac = price1usd*10**8/price2usdD;
        uint256 price2frac = price2usdD*10**8/price1usd;
        uint256 price3frac = price2usd*10**8/price1usdD;
        uint256 price4frac = price1usdD*10**8/price2usd;
        console.log("price1frac", price1frac);
        console.log("price2frac", price2frac);
        console.log("price3frac", price3frac);
        console.log("price4frac", price4frac);

        // uint256 price00 = FullMath.mulDiv(10 ** 18, sqrtRatioX96 ** 2, 2 ** 192);
        // uint256 price11 = FullMath.mulDiv(1, 2 ** 192, sqrtRatioX96 ** 2);
        // price11 = price11 / 100;
        // console.log("price!0", price00);
        // console.log("price!1", price11);
        return price1frac;
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
    function wethToUsd(uint256 amount) public view returns (uint256){
        // X / 100 because converting return e6+2 as oracle price but need to remove additional +2
        return AaveBorrowLibrary.convertTokenAmountToUsd(
            amount,
            wethDm,
            uint256(oracleWeth.latestAnswer())
        ) / 100;
    }

    /**
     * Get WMATIC equivalent from USD liquidity
     * @param liquidity USD liquidity in e6
     */
    function usdToWeth(uint256 liquidity) public view returns (uint256){
        // liquidity * 100 => because need e6+2 for converting but liq in e6
        return AaveBorrowLibrary.convertUsdToTokenAmount(
            liquidity * 100,
            wethDm,
            uint256(oracleWeth.latestAnswer())
        );
    }

    /**
     * Get USD equivalent in e6
     * @param amount USDC tokens amount
     */
    function wbtcToUsd(uint256 amount) public view returns (uint256){
        // X / 100 because converting return e6+2 as oracle price but need to remove additional +2
        return AaveBorrowLibrary.convertTokenAmountToUsd(
            amount,
            wbtcDm,
            uint256(oracleWbtc.latestAnswer())
        ) / 100;
    }

    /**
     * Get USDC equivalent from USD liquidity
     * @param liquidity USD liquidity in e6
     */
    function usdToWbtc(uint256 liquidity) public view returns (uint256){
        // liquidity * 100 => because need e6+2 for converting but liq in e6
        return AaveBorrowLibrary.convertUsdToTokenAmount(
            liquidity * 100,
            wbtcDm,
            uint256(oracleWbtc.latestAnswer())
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
