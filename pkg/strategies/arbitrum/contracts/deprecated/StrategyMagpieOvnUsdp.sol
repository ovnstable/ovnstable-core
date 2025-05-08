// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombat.sol";
import "@overnight-contracts/connectors/contracts/stuff/Magpie.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/TraderJoe.sol";
import "@overnight-contracts/connectors/contracts/stuff/Camelot.sol";

/**
 * @dev Self-investment strategy
 * 1) sell all USDC -> buy USD+ on self-investment pool (Overnight)
 * 2) invest USD+ to Overnight pool on Wombat
 * 3) Stake lp tokens in Magpie
 *
 * Sell rewards:
 * - WOM on UniswapV3
 * - MGP on TraderJoe
 *
 */

contract StrategyMagpieOvnUsdp is Strategy {

    // --- structs

    struct StrategyParams {
        address usdc;
        address usdt;
        address usdp;
        address weth;
        address wom;
        address mgp;
        address mgpLp;
        address stakingWombat;
        address poolWombat;
        address masterMgp;
        address poolHelperMgp;
        address wombatRouter;
        address uniswapV3Router;
        uint24 poolFee0;
        uint24 poolFee1;
        address traderJoeRouter;
        address camelotRouter;
    }

    // --- params

    IERC20 public usdc;
    IERC20 public usdp;
    IERC20 public usdt;
    IERC20 public weth;
    IERC20 public wom;
    IERC20 public mgp;
    IERC20 public mgpLp;

    address public stakingWombat;
    IWombatPool public poolWombat;
    MagpiePoolHelper public poolHelperMgp;
    MasterMagpie public masterMgp;

    IWombatRouter public router;
    ISwapRouter public uniswapV3Router;

    uint24 public poolFee0;
    uint24 public poolFee1;

    uint256 public assetWombatDm;

    JoeRouterV3 public traderJoeRouter;
    ICamelotRouter public camelotRouter;

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
        usdc = IERC20(params.usdc);
        usdt = IERC20(params.usdt);
        usdp = IERC20(params.usdp);
        weth = IERC20(params.weth);
        wom = IERC20(params.wom);
        mgp = IERC20(params.mgp);
        mgpLp = IERC20(params.mgpLp);

        stakingWombat = params.stakingWombat;
        poolHelperMgp = MagpiePoolHelper(params.poolHelperMgp);
        masterMgp = MasterMagpie(params.masterMgp);
        poolWombat = IWombatPool(params.poolWombat);
        router = IWombatRouter(params.wombatRouter);

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolFee0 = params.poolFee0;
        poolFee1 = params.poolFee1;

        assetWombatDm = 1e18;

        traderJoeRouter = JoeRouterV3(params.traderJoeRouter);
        camelotRouter = ICamelotRouter(params.camelotRouter);

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _swapAllToken0ToToken1(IERC20 token0, IERC20 token1) internal {

        uint256 amountToSwap = token0.balanceOf(address(this));

        uint256 amountOutMin = OvnMath.subBasisPoints(amountToSwap, swapSlippageBP);

        UniswapV3Library.singleSwap(
            uniswapV3Router,
            address(token0),
            address(token1),
            100, // 0.01%
            address(this),
            amountToSwap,
            amountOutMin
        );
    }


    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        // Swap All USDC->USD+
        _swapAllToken0ToToken1(usdc, usdp);

        uint256 amountUsdp = usdp.balanceOf(address(this));
        (uint256 assetAmount,) = poolWombat.quotePotentialDeposit(address(usdp), amountUsdp);

        usdp.approve(address(stakingWombat), amountUsdp);
        poolHelperMgp.deposit(amountUsdp, OvnMath.subBasisPoints(assetAmount, 1));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        // get amount to unstake
        (uint256 usdpAmountOneAsset,) = poolWombat.quotePotentialWithdraw(address(usdp), assetWombatDm);
        // add 1bp for smooth withdraw
        uint256 assetAmount = OvnMath.addBasisPoints(_amount, swapSlippageBP) * assetWombatDm / usdpAmountOneAsset;
        uint256 assetBalance = poolHelperMgp.balance(address(this));
        if (assetAmount > assetBalance) {
            assetAmount = assetBalance;
        }

        poolHelperMgp.withdraw(assetAmount, _amount);

        // Swap All USD+-> USDC
        _swapAllToken0ToToken1(usdp, usdc);

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 assetBalance = poolHelperMgp.balance(address(this));
        (uint256 usdpAmount,) = poolWombat.quotePotentialWithdraw(address(usdp), assetBalance);

        poolHelperMgp.withdraw(assetBalance, OvnMath.subBasisPoints(usdpAmount, 1));

        // Swap All USD+-> USDC
        _swapAllToken0ToToken1(usdp, usdc);

        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        uint256 usdcBalance = usdc.balanceOf(address(this));
        usdcBalance += usdp.balanceOf(address(this));

        uint256 assetBalance = poolHelperMgp.balance(address(this));
        assetBalance += IWombatAsset(poolHelperMgp.lpToken()).balanceOf(address(this));
        if (assetBalance > 0) {
            (uint256 usdpAmount,) = poolWombat.quotePotentialWithdraw(address(usdp), assetBalance);
            usdcBalance += usdpAmount;
        }

        return usdcBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        if (poolHelperMgp.balance(address(this)) > 0) {

            // harvest wom rewards
            poolHelperMgp.harvest();

            address[] memory stakingRewards = new address[](1);
            stakingRewards[0] = address(mgpLp);

            address[] memory tokens = new address[](2);
            tokens[0] = address(wom);
            tokens[1] = address(mgp);

            address[][] memory rewardTokens = new address [][](1);
            rewardTokens[0] = tokens;

            masterMgp.multiclaimSpec(stakingRewards, rewardTokens);
        }

        // sell rewards
        uint256 totalUsdc;

        uint256 womBalance = wom.balanceOf(address(this));
        if (womBalance > 0) {
            uint256 womAmount = CamelotLibrary.getAmountsOut(
                camelotRouter,
                address(wom),
                address(usdt),
                address(usdc),
                womBalance
            );

            if (womAmount > 0) {
                uint256 balanceUsdcBefore = usdc.balanceOf(address(this));
                CamelotLibrary.multiSwap(
                    camelotRouter,
                    address(wom),
                    address(usdt),
                    address(usdc),
                    womBalance,
                    womAmount * 99 / 100,
                    address(this)
                );
                uint256 womUsdc = usdc.balanceOf(address(this)) - balanceUsdcBefore;
                totalUsdc += womUsdc;
            }
        }

        uint256 mgpBalance = mgp.balanceOf(address(this));
        if (mgpBalance > 0) {
            IERC20[] memory tokenPath = new IERC20[](3);
            tokenPath[0] = mgp;
            tokenPath[1] = weth;
            tokenPath[2] = usdc;

            uint256[] memory pairBinSteps = new uint256[](2);
            pairBinSteps[0] = 0;
            pairBinSteps[1] = 0;

            Version[] memory versions = new Version[](2);
            versions[0] = Version.V1;
            versions[1] = Version.V1;

            Path memory path;
            path.pairBinSteps = pairBinSteps;
            path.tokenPath = tokenPath;
            path.versions = versions;

            mgp.approve(address(traderJoeRouter), mgpBalance);

            uint256 mgpUsdc = traderJoeRouter.swapExactTokensForTokens(
                mgpBalance,
                0,
                path,
                address(this),
                block.timestamp
            );

            totalUsdc += mgpUsdc;
        }

        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

    function stakeLPTokens() external onlyPortfolioAgent {
        uint256 assetBalance = IWombatAsset(poolHelperMgp.lpToken()).balanceOf(address(this));
        if (assetBalance > 0) {
            IWombatAsset(poolHelperMgp.lpToken()).approve(address(stakingWombat), assetBalance);
            poolHelperMgp.depositLP(assetBalance);
        }
    }
}
