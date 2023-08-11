// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/BaseSwap.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";

contract StrategyBaseSwapUsdbcDai is Strategy {

    // --- structs

    struct StrategyParams {
        address usdbc;
        address dai;
        address weth;
        address bswap;
        address oracleUsdbc;
        address oracleDai;
        address router;
        address masterChef;
        address pair;
        uint256 pid;
        address uniswapV3Router;
        uint24 poolFee;
    }

    // --- params

    IERC20 public usdbc;
    IERC20 public dai;
    IERC20 public weth;
    IERC20 public bswap;

    IPriceFeed public oracleUsdbc;
    IPriceFeed public oracleDai;

    IBaseSwapRouter02 public router;
    IMasterChefV2 public masterChef;
    IBaseSwapPair public pair;
    uint256 public pid;

    ISwapRouter public uniswapV3Router;
    uint24 public poolFee;

    uint256 public usdbcDm;
    uint256 public daiDm;

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

        usdbc = IERC20(params.usdbc);
        dai = IERC20(params.dai);
        weth = IERC20(params.weth);
        bswap = IERC20(params.bswap);

        oracleUsdbc = IPriceFeed(params.oracleUsdbc);
        oracleDai = IPriceFeed(params.oracleDai);

        router = IBaseSwapRouter02(params.router);
        masterChef = IMasterChefV2(params.masterChef);
        pair = IBaseSwapPair(params.pair);
        pid = params.pid;

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolFee = params.poolFee;

        usdbcDm = 10 ** IERC20Metadata(params.usdbc).decimals();
        daiDm = 10 ** IERC20Metadata(params.dai).decimals();

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        // get amount to swap
        (uint256 reserveDai, uint256 reserveUsdbc,) = pair.getReserves();
        uint256 usdbcBalance = usdbc.balanceOf(address(this));
        uint256 amountUsdbcToSwap = (usdbcBalance * reserveDai) / (reserveUsdbc * daiDm / usdbcDm + reserveDai);
        uint256 amountDaiMin = OvnMath.subBasisPoints(_oracleUsdbcToDai(amountUsdbcToSwap), swapSlippageBP);

        // swap
        UniswapV3Library.singleSwap(
            uniswapV3Router,
            address(usdbc),
            address(dai),
            poolFee,
            address(this),
            amountUsdbcToSwap,
            amountDaiMin
        );

        // add liquidity
        usdbcBalance = usdbc.balanceOf(address(this));
        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 daiAmount = usdbcBalance * reserveDai / reserveUsdbc;
        if (daiAmount <= daiBalance) {
            daiBalance = daiAmount;
        } else {
            uint256 usdbcAmount = daiBalance * reserveUsdbc / reserveDai;
            if (usdbcAmount <= usdbcBalance) {
                usdbcBalance = usdbcAmount;
            }
        }
        usdbc.approve(address(router), usdbcBalance);
        dai.approve(address(router), daiBalance);
        router.addLiquidity(
            address(dai),
            address(usdbc),
            daiBalance,
            usdbcBalance,
            OvnMath.subBasisPoints(daiBalance, stakeSlippageBP),
            OvnMath.subBasisPoints(usdbcBalance, stakeSlippageBP),
            address(this),
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
        (uint256 reserveDai, uint256 reserveUsdbc,) = pair.getReserves();
        uint256 amountUsdbcToUnstake = OvnMath.addBasisPoints(_amount + 10, swapSlippageBP);
        uint256 amountLp = (totalLpBalance * amountUsdbcToUnstake) / (reserveUsdbc + reserveDai * usdbcDm / daiDm);
        (uint256 lpTokenBalance,) = masterChef.userInfo(pid, address(this));
        if (amountLp > lpTokenBalance) {
            amountLp = lpTokenBalance;
        }
        uint256 amountUsdbc = reserveUsdbc * amountLp / totalLpBalance;
        uint256 amountDai = reserveDai * amountLp / totalLpBalance;

        // unstake
        masterChef.withdraw(pid, amountLp);

        // remove liquidity
        pair.approve(address(router), amountLp);
        router.removeLiquidity(
            address(dai),
            address(usdbc),
            amountLp,
            OvnMath.subBasisPoints(amountDai, stakeSlippageBP),
            OvnMath.subBasisPoints(amountUsdbc, stakeSlippageBP),
            address(this),
            block.timestamp
        );

        // swap
        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 amountUsdbcMin = OvnMath.subBasisPoints(_oracleDaiToUsdbc(daiBalance), swapSlippageBP);
        UniswapV3Library.singleSwap(
            uniswapV3Router,
            address(dai),
            address(usdbc),
            poolFee,
            address(this),
            daiBalance,
            amountUsdbcMin
        );

        return usdbc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        // get amount to unstake
        (uint256 lpTokenBalance,) = masterChef.userInfo(pid, address(this));
        if (lpTokenBalance == 0) {
            return usdbc.balanceOf(address(this));
        }
        uint256 totalLpBalance = pair.totalSupply();
        (uint256 reserveDai, uint256 reserveUsdbc,) = pair.getReserves();
        uint256 amountUsdbc = reserveUsdbc * lpTokenBalance / totalLpBalance;
        uint256 amountDai = reserveDai * lpTokenBalance / totalLpBalance;

        // unstake
        masterChef.withdraw(pid, lpTokenBalance);

        // remove liquidity
        pair.approve(address(router), lpTokenBalance);
        router.removeLiquidity(
            address(dai),
            address(usdbc),
            lpTokenBalance,
            OvnMath.subBasisPoints(amountDai, stakeSlippageBP),
            OvnMath.subBasisPoints(amountUsdbc, stakeSlippageBP),
            address(this),
            block.timestamp
        );

        // swap
        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 amountUsdbcMin = OvnMath.subBasisPoints(_oracleDaiToUsdbc(daiBalance), swapSlippageBP);
        UniswapV3Library.singleSwap(
            uniswapV3Router,
            address(dai),
            address(usdbc),
            poolFee,
            address(this),
            daiBalance,
            amountUsdbcMin
        );

        return usdbc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 usdbcBalance = usdbc.balanceOf(address(this));
        uint256 daiBalance = dai.balanceOf(address(this));

        (uint256 lpTokenBalance,) = masterChef.userInfo(pid, address(this));
        if (lpTokenBalance > 0) {
            uint256 totalLpBalance = pair.totalSupply();
            (uint256 reserveDai, uint256 reserveUsdbc,) = pair.getReserves();
            usdbcBalance += reserveUsdbc * lpTokenBalance / totalLpBalance;
            daiBalance += reserveDai * lpTokenBalance / totalLpBalance;
        }

        if (daiBalance > 0) {
            if (nav) {
                usdbcBalance += _oracleDaiToUsdbc(daiBalance);
            } else {
                usdbcBalance += OvnMath.subBasisPoints(_oracleDaiToUsdbc(daiBalance), swapSlippageBP);
            }
        }

        return usdbcBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        (uint256 lpTokenBalance,) = masterChef.userInfo(pid, address(this));
        if (lpTokenBalance == 0) {
            return 0;
        }

        // claim rewards
        masterChef.deposit(pid, 0);

        // sell rewards
        uint256 totalUsdbc;

        uint256 bswapBalance = bswap.balanceOf(address(this));
        if (bswapBalance > 0) {
            uint256 bswapAmount = BaseSwapLibrary.getAmountOut(
                address(router),
                address(bswap),
                address(weth),
                address(usdbc),
                bswapBalance
            );
            if (bswapAmount > 0) {
                totalUsdbc += BaseSwapLibrary.multiSwap(
                    address(router),
                    address(bswap),
                    address(weth),
                    address(usdbc),
                    bswapBalance,
                    bswapAmount * 99 / 100,
                    address(this)
                );
            }
        }

        if (totalUsdbc > 0) {
            usdbc.transfer(_to, totalUsdbc);
        }

        return totalUsdbc;
    }

    function _oracleDaiToUsdbc(uint256 daiAmount) internal view returns (uint256) {
        uint256 priceDai = ChainlinkLibrary.getPrice(oracleDai);
        uint256 priceUsdbc = ChainlinkLibrary.getPrice(oracleUsdbc);
        return ChainlinkLibrary.convertTokenToToken(daiAmount, daiDm, usdbcDm, priceDai, priceUsdbc);
    }

    function _oracleUsdbcToDai(uint256 usdbcAmount) internal view returns (uint256) {
        uint256 priceDai = ChainlinkLibrary.getPrice(oracleDai);
        uint256 priceUsdbc = ChainlinkLibrary.getPrice(oracleUsdbc);
        return ChainlinkLibrary.convertTokenToToken(usdbcAmount, usdbcDm, daiDm, priceUsdbc, priceDai);
    }
}
