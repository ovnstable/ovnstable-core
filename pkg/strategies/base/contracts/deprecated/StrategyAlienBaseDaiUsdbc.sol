// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/AlienBase.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/core/contracts/interfaces/IInchSwapper.sol";

contract StrategyAlienBaseDaiUsdbc is Strategy {

    // --- structs

    struct StrategyParams {
        address dai;
        address usdbc;
        address weth;
        address alb;
        address oracleDai;
        address oracleUsdbc;
        address alienBaseRouter;
        address swapFlashLoan;
        address masterChef;
        address pair;
        uint256 pid;
        address uniswapV3Router;
        uint24 poolFee;
        address inchSwapper;
    }

    // --- params

    IERC20 public dai;
    IERC20 public usdbc;
    IERC20 public weth;
    IERC20 public alb;

    IPriceFeed public oracleDai;
    IPriceFeed public oracleUsdbc;

    IAlienBaseRouter02 public alienBaseRouter;
    ISwapFlashLoan public swapFlashLoan;
    IBasedDistributorV2 public masterChef;
    IERC20 public pair;
    uint256 public pid;

    ISwapRouter public uniswapV3Router;
    uint24 public poolFee;

    uint256 public daiDm;
    uint256 public usdbcDm;

    IInchSwapper public inchSwapper;

    // --- events

    event StrategyUpdatedParams();

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {

        dai = IERC20(params.dai);
        usdbc = IERC20(params.usdbc);
        weth = IERC20(params.weth);
        alb = IERC20(params.alb);

        oracleDai = IPriceFeed(params.oracleDai);
        oracleUsdbc = IPriceFeed(params.oracleUsdbc);

        alienBaseRouter = IAlienBaseRouter02(params.alienBaseRouter);
        swapFlashLoan = ISwapFlashLoan(params.swapFlashLoan);
        masterChef = IBasedDistributorV2(params.masterChef);
        pair = IERC20(params.pair);
        pid = params.pid;

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolFee = params.poolFee;

        daiDm = 10 ** IERC20Metadata(params.dai).decimals();
        usdbcDm = 10 ** IERC20Metadata(params.usdbc).decimals();

        inchSwapper = IInchSwapper(params.inchSwapper);
        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        // get amount to swap
        uint256 reserveDai = dai.balanceOf(address(swapFlashLoan));
        uint256 reserveUsdbc = usdbc.balanceOf(address(swapFlashLoan));
        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 amountDaiToSwap = (daiBalance * reserveUsdbc) / (reserveDai * usdbcDm / daiDm + reserveUsdbc);
        uint256 amountUsdbcMin = OvnMath.subBasisPoints(_oracleDaiToUsdbc(amountDaiToSwap), swapSlippageBP);
        uint256 totalLpBalance = pair.totalSupply();
        uint256 amountLpMin = OvnMath.subBasisPoints((totalLpBalance * daiBalance) / (reserveDai + reserveUsdbc * daiDm / usdbcDm), stakeSlippageBP);

        // swap

        dai.approve(address(inchSwapper), amountDaiToSwap);
        inchSwapper.swap(address(this), address(dai), address(usdbc), amountDaiToSwap, amountUsdbcMin);

        // count amounts
        daiBalance = dai.balanceOf(address(this));
        uint256 usdbcBalance = usdbc.balanceOf(address(this));
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = usdbcBalance;
        amounts[1] = daiBalance;

        // add liquidity
        dai.approve(address(swapFlashLoan), daiBalance);
        usdbc.approve(address(swapFlashLoan), usdbcBalance);
        swapFlashLoan.addLiquidity(
            amounts,
            amountLpMin,
            block.timestamp
        );

        // stake
        uint256 lpTokenBalance = pair.balanceOf(address(this));
        pair.approve(address(masterChef), lpTokenBalance);
        masterChef.deposit(pid, lpTokenBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        // get amount to unstake
        uint256 totalLpBalance = pair.totalSupply();
        uint256 reserveDai = dai.balanceOf(address(swapFlashLoan));
        uint256 reserveUsdbc = usdbc.balanceOf(address(swapFlashLoan));
        uint256 amountDaiToUnstake = OvnMath.addBasisPoints(_amount + 10, swapSlippageBP);
        uint256 amountLp = (totalLpBalance * amountDaiToUnstake) / (reserveDai + reserveUsdbc * daiDm / usdbcDm);
        uint256 lpTokenBalance = masterChef.userInfo(pid, address(this)).amount;
        if (amountLp > lpTokenBalance) {
            amountLp = lpTokenBalance;
        }
        uint256 amountDai = reserveDai * amountLp / totalLpBalance;
        uint256 amountUsdbc = reserveUsdbc * amountLp / totalLpBalance;

        uint256[] memory minAmounts = new uint256[](2);
        minAmounts[0] = OvnMath.subBasisPoints(amountUsdbc, stakeSlippageBP);
        minAmounts[1] = OvnMath.subBasisPoints(amountDai, stakeSlippageBP);

        // unstake
        masterChef.withdraw(pid, amountLp);

        // remove liquidity
        pair.approve(address(swapFlashLoan), amountLp);
        swapFlashLoan.removeLiquidity(
            amountLp,
            minAmounts,
            block.timestamp
        );

        // swap
        uint256 usdbcBalance = usdbc.balanceOf(address(this));
        uint256 amountDaiMin = OvnMath.subBasisPoints(_oracleUsdbcToDai(usdbcBalance), swapSlippageBP);

        usdbc.approve(address(inchSwapper), usdbcBalance);
        inchSwapper.swap(address(this), address(usdbc), address(dai), usdbcBalance, amountDaiMin);

        return dai.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        // get amount to unstake
        uint256 lpTokenBalance = masterChef.userInfo(pid, address(this)).amount;
        if (lpTokenBalance == 0) {
            return dai.balanceOf(address(this));
        }
        uint256 totalLpBalance = pair.totalSupply();
        uint256 reserveDai = dai.balanceOf(address(swapFlashLoan));
        uint256 reserveUsdbc = usdbc.balanceOf(address(swapFlashLoan));
        uint256 amountDai = reserveDai * lpTokenBalance / totalLpBalance;
        uint256 amountUsdbc = reserveUsdbc * lpTokenBalance / totalLpBalance;

        uint256[] memory minAmounts = new uint256[](2);
        minAmounts[0] = OvnMath.subBasisPoints(amountUsdbc, stakeSlippageBP);
        minAmounts[1] = OvnMath.subBasisPoints(amountDai, stakeSlippageBP);

        // unstake
        masterChef.withdraw(pid, lpTokenBalance);

        // remove liquidity
        pair.approve(address(swapFlashLoan), lpTokenBalance);
        swapFlashLoan.removeLiquidity(
            lpTokenBalance,
            minAmounts,
            block.timestamp
        );

        // swap
        uint256 usdbcBalance = usdbc.balanceOf(address(this));
        uint256 amountDaiMin = OvnMath.subBasisPoints(_oracleUsdbcToDai(usdbcBalance), swapSlippageBP);

        usdbc.approve(address(inchSwapper), usdbcBalance);
        inchSwapper.swap(address(this), address(usdbc), address(dai), usdbcBalance, amountDaiMin);

        return dai.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 usdbcBalance = usdbc.balanceOf(address(this));

        uint256 lpTokenBalance = masterChef.userInfo(pid, address(this)).amount;
        if (lpTokenBalance > 0) {
            uint256[] memory tokenBalances = swapFlashLoan.calculateRemoveLiquidity(lpTokenBalance);
            daiBalance += tokenBalances[1];
            usdbcBalance += tokenBalances[0];
        }

        if (usdbcBalance > 0) {
            if (nav) {
                daiBalance += _oracleUsdbcToDai(usdbcBalance);
            } else {
                daiBalance += OvnMath.subBasisPoints(_oracleUsdbcToDai(usdbcBalance), swapSlippageBP);
            }
        }

        return daiBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        uint256 lpTokenBalance = masterChef.userInfo(pid, address(this)).amount;
        if (lpTokenBalance > 0) {
            masterChef.deposit(pid, 0);
        }

        uint256 albBalance = alb.balanceOf(address(this));

        // Problem with sell rewards on AlienBase.
        // We will make it manually and return to pm.
        if(albBalance > 0){
            alb.transfer(0x66B439c0a695cc3Ed3d9f50aA4E6D2D917659FfD, albBalance);
        }

        return 0;
    }

    function _oracleUsdbcToDai(uint256 usdbcAmount) internal view returns (uint256) {
        uint256 priceUsdbc = ChainlinkLibrary.getPrice(oracleUsdbc);
        uint256 priceDai = ChainlinkLibrary.getPrice(oracleDai);
        return ChainlinkLibrary.convertTokenToToken(usdbcAmount, usdbcDm, daiDm, priceUsdbc, priceDai);
    }

    function _oracleDaiToUsdbc(uint256 daiAmount) internal view returns (uint256) {
        uint256 priceUsdbc = ChainlinkLibrary.getPrice(oracleUsdbc);
        uint256 priceDai = ChainlinkLibrary.getPrice(oracleDai);
        return ChainlinkLibrary.convertTokenToToken(daiAmount, daiDm, usdbcDm, priceDai, priceUsdbc);
    }

}
