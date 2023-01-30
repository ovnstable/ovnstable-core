// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Ellipsis.sol";
import "@overnight-contracts/connectors/contracts/stuff/DotDot.sol";
import "@overnight-contracts/connectors/contracts/stuff/PancakeV2.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombat.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";

import "hardhat/console.sol";

contract FlashStrategyEllipsisDotDotBusd {

    // --- structs

    struct StrategyParams {
        address busd;
        address usdc;
        address usdt;
        address wBnb;
        address ddd;
        address epx;
        address valas;
        address val3EPS;
        address pool;
        address lpDepositor;
        address pancakeRouter;
        address wombatRouter;
        address wombatPool;
        address oracleBusd;
        address oracleUsdc;
        address oracleUsdt;
    }

    // --- params

    IERC20 public busd;
    IERC20 public usdc;
    IERC20 public usdt;
    IERC20 public wBnb;
    IERC20 public ddd;
    IERC20 public epx;
    IERC20 public valas;

    IERC20 public val3EPS;

    IEllipsisPool public pool;
    ILpDepositor public lpDepositor;

    IPancakeRouter02 public pancakeRouter;

    IWombatRouter public wombatRouter;
    address public wombatPool;

    IPriceFeed public oracleBusd;
    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleUsdt;

    uint256 public dm18;

    // --- events

    event StrategyUpdatedParams();

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {}

    // --- Setters

    function setParams(StrategyParams calldata params) external {
        busd = IERC20(params.busd);
        usdc = IERC20(params.usdc);
        usdt = IERC20(params.usdt);
        wBnb = IERC20(params.wBnb);
        ddd = IERC20(params.ddd);
        epx = IERC20(params.epx);
        valas = IERC20(params.valas);

        val3EPS = IERC20(params.val3EPS);

        pool = IEllipsisPool(params.pool);
        lpDepositor = ILpDepositor(params.lpDepositor);

        pancakeRouter = IPancakeRouter02(params.pancakeRouter);

        wombatRouter = IWombatRouter(params.wombatRouter);
        wombatPool = params.wombatPool;

        oracleBusd = IPriceFeed(params.oracleBusd);
        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleUsdt = IPriceFeed(params.oracleUsdt);

        dm18 = 1e18;

        emit StrategyUpdatedParams();
    }

    // --- logic

    function flashAttack(
        address _asset,
        uint256 amount,
        uint256 index
    ) external {
        _stake(_asset, amount, index);
        showBalances('Stake 50kk');

//        _unstakeInExactToken(address(usdc), amount / 50, 1, 1);
//        showBalances('Unstake USDC');
//
//        _unstakeInExactToken(address(usdt), amount / 100, 2, 2);
//        showBalances('Unstake USDT');
    }

    function showBalances(string memory step) internal {

        console.log(step);
        console.log('Balances pool:');

        console.log("- BUSD:  %s", pool.balances(0) / 1e18);
        console.log("- USDC:  %s", pool.balances(1) / 1e18);
        console.log("- USDT:  %s", pool.balances(2) / 1e18);

        console.log('Common:');
        console.log("- NAV:  %s", netAssetValue() / 1e18);
        console.log("- BUSD: %s", busd.balanceOf(address(this)) / 1e18);
        console.log('');
    }

    function _stake(
        address _asset,
        uint256 _amount,
        uint256 index
    ) internal {

        // calculate amount to stake
        uint256 assetBalance = IERC20(_asset).balanceOf(address(this));
        uint256[3] memory amounts;
        // sub 4 bp to calculate min amount
        amounts[0] = 0;
        amounts[1] = 0;
        amounts[2] = 0;
        amounts[index] = OvnMath.subBasisPoints(assetBalance, 4);
        uint256 minToMint = pool.calc_token_amount(amounts, true);
        amounts[index] = assetBalance;

        // add liquidity
        IERC20(_asset).approve(address(pool), assetBalance);
        uint256 val3EPSBalance = pool.add_liquidity(amounts, minToMint);

        // stake
        val3EPS.approve(address(lpDepositor), val3EPSBalance);
        lpDepositor.deposit(address(this), address(val3EPS), val3EPSBalance);
    }

    function _unstakeInExactToken(
        address _asset,
        uint256 _amount,
        uint256 index0,
        int128 index1
    ) internal returns (uint256) {

        // calculate amount to unstake
        uint256[3] memory amounts;
        // add 4 bp to unstake more than requested
        amounts[0] = 0;
        amounts[1] = 0;
        amounts[2] = 0;
        amounts[index0] = OvnMath.addBasisPoints(_amount, 4) + 10;
        uint256 val3EPSAmount = pool.calc_token_amount(amounts, false);
        uint256 val3EPSBalance = lpDepositor.userBalances(address(this), address(val3EPS));
        if (val3EPSAmount > val3EPSBalance) {
            val3EPSAmount = val3EPSBalance;
        }

        // unstake
        lpDepositor.withdraw(address(this), address(val3EPS), val3EPSAmount);

        // remove liquidity
        val3EPSBalance = val3EPS.balanceOf(address(this));
        val3EPS.approve(address(pool), val3EPSBalance);
        pool.remove_liquidity_one_coin(val3EPSBalance, index1, _amount);

        return IERC20(_asset).balanceOf(address(this));
    }

    function netAssetValue() public view returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() public view returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 busdBalance = busd.balanceOf(address(this));
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 usdtBalance = usdt.balanceOf(address(this));

        uint256 val3EPSBalance = lpDepositor.userBalances(address(this), address(val3EPS));
        if (val3EPSBalance > 0) {
            uint256 totalSupply = val3EPS.totalSupply();
            for (uint256 i = 0; i < 3; i++) {
                uint256 coinBalance = val3EPSBalance * pool.balances(i) / totalSupply;
                if (address(busd) == pool.coins(i)) {
                    busdBalance += coinBalance;
                } else if (address(usdc) == pool.coins(i)) {
                    usdcBalance += coinBalance;
                } else if (address(usdt) == pool.coins(i)) {
                    usdtBalance += coinBalance;
                }
            }
        }

        if (nav) {
            if (usdcBalance > 0) {
                busdBalance += ChainlinkLibrary.convertTokenToToken(
                    usdcBalance,
                    dm18,
                    dm18,
                    oracleUsdc,
                    oracleBusd
                );
            }
            if (usdtBalance > 0) {
                busdBalance += ChainlinkLibrary.convertTokenToToken(
                    usdtBalance,
                    dm18,
                    dm18,
                    oracleUsdt,
                    oracleBusd
                );
            }
        } else {
            if (usdcBalance > 0) {
                busdBalance += WombatLibrary.getAmountOut(
                    wombatRouter,
                    address(usdc),
                    address(busd),
                    address(wombatPool),
                    usdcBalance
                );
            }
            if (usdtBalance > 0) {
                busdBalance += WombatLibrary.getAmountOut(
                    wombatRouter,
                    address(usdt),
                    address(busd),
                    address(wombatPool),
                    usdtBalance
                );
            }
        }

        return busdBalance;
    }

}
