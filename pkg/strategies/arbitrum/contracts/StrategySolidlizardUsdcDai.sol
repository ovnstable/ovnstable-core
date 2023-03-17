// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/core/contracts/interfaces/IStaker.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Gmx.sol";
import "@overnight-contracts/connectors/contracts/stuff/SolidLizard.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";

contract StrategySolidlizardUsdcDai is Strategy {

    // --- structs

    struct StrategyParams {
        address usdc;
        address dai;
        address sliz;
        address pair;
        address router;
        address gauge;
        address staker;
        address oracleDai;
        address oracleUsdc;
        address gmxRouter;
        address gmxVault;
        address gmxReader;
        address uniswapV3Router;
        uint24 poolFee;
    }

    // --- params

    IERC20 public dai;
    IERC20 public usdc;
    IERC20 public sliz;
    uint256 public daiDm;
    uint256 public usdcDm;
    IPriceFeed public oracleDai;
    IPriceFeed public oracleUsdc;

    // Stake
    ILizardGauge public gauge;
    ILizardPair public pair;
    ILizardRouter01 public router;
    IStaker public staker;

    // Swap
    IRouter public gmxRouter;
    IVault public gmxVault;
    GmxReader public gmxReader;

    ISwapRouter public uniswapV3Router;
    uint24 public poolFee;


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
        usdc = IERC20(params.usdc);
        sliz = IERC20(params.sliz);
        oracleDai = IPriceFeed(params.oracleDai);
        oracleUsdc = IPriceFeed(params.oracleUsdc);
        gmxRouter = IRouter(params.gmxRouter);
        gmxVault = IVault(params.gmxVault);
        gmxReader = GmxReader(params.gmxReader);
        gauge = ILizardGauge(params.gauge);
        pair = ILizardPair(params.pair);
        router = ILizardRouter01(params.router);
        staker = IStaker(params.staker);
        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolFee = params.poolFee;

        daiDm = 10 ** IERC20Metadata(params.dai).decimals();
        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        (uint256 reserveDai, uint256 reserveUsdc,) = pair.getReserves();
        require(reserveUsdc > 10 ** 3 && reserveDai > 10 ** 15, 'Liquidity lpToken reserves too low');

        uint256 usdcBalance = usdc.balanceOf(address(this));

        uint256 amountUsdcIn = GmxLibrary.getAmountToSwap(
            gmxVault,
            gmxReader,
            address(usdc),
            address(dai),
            usdcBalance,
            reserveUsdc,
            reserveDai,
            usdcDm,
            daiDm,
            1
        );

        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleDaiToUsdc(amountUsdcIn), swapSlippageBP);

        _swap(address(usdc), address(dai), amountUsdcIn, amountOutMin);

        usdcBalance = usdc.balanceOf(address(this));
        uint256 daiBalance = dai.balanceOf(address(this));

        usdc.approve(address(router), usdcBalance);
        dai.approve(address(router), daiBalance);

        router.addLiquidity(
            address(dai),
            address(usdc),
            true,
            daiBalance,
            usdcBalance,
            OvnMath.subBasisPoints(daiBalance, stakeSlippageBP),
            OvnMath.subBasisPoints(usdcBalance, stakeSlippageBP),
            address(this),
            block.timestamp
        );

        uint256 lpTokenBalance = pair.balanceOf(address(this));
        pair.approve(address(staker), lpTokenBalance);
        staker.deposit(address(gauge), lpTokenBalance, address(pair));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 totalLpBalance = pair.totalSupply();
        (uint256 reserveDai, uint256 reserveUsdc,) = pair.getReserves();

        uint256 amountLp = GmxLibrary.getAmountLpTokens(
            gmxVault,
            gmxReader,
            address(usdc),
            address(dai),
            OvnMath.addBasisPoints(_amount + 10, 1),
            totalLpBalance,
            reserveUsdc,
            reserveDai,
            usdcDm,
            daiDm,
            1
        );

        uint256 lpTokenBalance = gauge.balanceOf(address(staker));

        if (amountLp > lpTokenBalance) {
            amountLp = lpTokenBalance;
        }

        uint256 amountUsdc = reserveUsdc * amountLp / totalLpBalance;
        uint256 amountDai = reserveDai * amountLp / totalLpBalance;

        staker.withdraw(address(gauge), amountLp, address(pair));

        pair.approve(address(router), amountLp);
        router.removeLiquidity(
            address(dai),
            address(usdc),
            true,
            amountLp,
            OvnMath.subBasisPoints(amountDai, stakeSlippageBP),
            OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP),
            address(this),
            block.timestamp
        );

        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleDaiToUsdc(daiBalance), swapSlippageBP);

        _swap(address(dai), address(usdc), daiBalance, amountOutMin);

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 lpTokenBalance = gauge.balanceOf(address(staker));

        if (lpTokenBalance == 0) {
            return usdc.balanceOf(address(this));
        }

        staker.withdraw(address(gauge), lpTokenBalance, address(pair));

        uint256 totalLpBalance = pair.totalSupply();
        (uint256 reserveDai, uint256 reserveUsdc,) = pair.getReserves();

        uint256 amountUsdc = reserveUsdc * lpTokenBalance / totalLpBalance;
        uint256 amountDai = reserveDai * lpTokenBalance / totalLpBalance;

        pair.approve(address(router), lpTokenBalance);
        router.removeLiquidity(
            address(dai),
            address(usdc),
            true,
            lpTokenBalance,
            OvnMath.subBasisPoints(amountDai, stakeSlippageBP),
            OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP),
            address(this),
            block.timestamp
        );

        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 amountOutMin = OvnMath.subBasisPoints(_oracleDaiToUsdc(daiBalance), swapSlippageBP);

        _swap(address(dai), address(usdc), daiBalance, amountOutMin);

        return usdc.balanceOf(address(this));
    }


    function _swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin) internal {

        // Gmx Vault has max limit for accepting tokens, for example DAI max capacity: 35kk$
        // If after swap vault of balance more capacity then transaction revert
        // We check capacity and if it not enough then use other swap route (UniswapV3)

        if (gmxVault.maxUsdgAmounts(address(tokenIn)) > amountIn + gmxVault.poolAmounts(address(tokenIn))) {

            GmxLibrary.singleSwap(
                gmxRouter,
                address(tokenIn),
                address(tokenOut),
                amountIn,
                amountOutMin);

        } else {

            UniswapV3Library.singleSwap(
                uniswapV3Router,
                address(tokenIn),
                address(tokenOut),
                poolFee,
                address(this),
                amountIn,
                amountOutMin
            );
        }
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 daiBalance = dai.balanceOf(address(this));

        uint256 lpTokenBalance = gauge.balanceOf(address(staker));
        if (lpTokenBalance > 0) {
            uint256 totalLpBalance = pair.totalSupply();
            (uint256 reserveDai, uint256 reserveUsdc,) = pair.getReserves();
            usdcBalance += reserveUsdc * lpTokenBalance / totalLpBalance;
            daiBalance += reserveDai * lpTokenBalance / totalLpBalance;
        }

        uint256 usdcBalanceFromDai;
        if (daiBalance > 0) {
            if (nav) {
                usdcBalanceFromDai = _oracleDaiToUsdc(daiBalance);
            } else {
                usdcBalanceFromDai = GmxLibrary.getAmountOut(gmxVault, gmxReader, address(dai), address(usdc), daiBalance);
            }
        }

        return usdcBalance + usdcBalanceFromDai;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        if (gauge.balanceOf(address(staker)) == 0) {
            return 0;
        }


        // claim rewards
        address[] memory tokens = new address[](1);
        tokens[0] = address(sliz);
        staker.harvestRewards(address(gauge), tokens);

        // sell rewards
        uint256 totalUsdc;

        uint256 slizBalance = sliz.balanceOf(address(this));
        if (slizBalance > 0) {
            uint256 amountOut = SolidLizardLibrary.getAmountsOut(
                router,
                address(sliz),
                address(usdc),
                false,
                slizBalance
            );

            if (amountOut > 0) {
                uint256 slizUsdc = SolidLizardLibrary.singleSwap(
                    router,
                    address(sliz),
                    address(usdc),
                    false,
                    slizBalance,
                    amountOut * 99 / 100,
                    address(this)
                );
                totalUsdc += slizUsdc;
            }

        }

        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

    function _oracleDaiToUsdc(uint256 daiAmount) internal view returns (uint256) {
        uint256 priceDai = ChainlinkLibrary.getPrice(oracleDai);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(daiAmount, daiDm, usdcDm, priceDai, priceUsdc);
    }

    function _oracleUsdcToDai(uint256 usdcAmount) internal view returns (uint256) {
        uint256 priceDai = ChainlinkLibrary.getPrice(oracleDai);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(usdcAmount, usdcDm, daiDm, priceUsdc, priceDai);
    }
}
