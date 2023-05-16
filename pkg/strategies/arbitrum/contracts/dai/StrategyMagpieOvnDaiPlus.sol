// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombat.sol";
import "@overnight-contracts/connectors/contracts/stuff/Magpie.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/TraderJoe.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";

contract StrategyMagpieOvnDaiPlus is Strategy {

    // --- structs

    struct StrategyParams {
        address dai;
        address daiPlus;
        address usdt;
        address usdc;
        address weth;
        address wom;
        address mgp;
        address mgpLp;
        address stakingWombat;
        address poolWombat;
        address basePoolWombat;
        address routerWombat;
        address masterMgp;
        address poolHelperMgp;
        address uniswapV3Router;
        uint24 poolFee0;
        uint24 poolFee1;
        address traderJoeRouter;
    }

    // --- params

    IERC20 public dai;
    IERC20 public daiPlus;
    IERC20 public usdt;
    IERC20 public usdc;
    IERC20 public weth;
    IERC20 public wom;
    IERC20 public mgp;
    IERC20 public mgpLp;

    address public stakingWombat;
    IWombatPool public poolWombat;
    IWombatPool public basePoolWombat;
    IWombatRouter public router;
    MagpiePoolHelper public poolHelperMgp;
    MasterMagpie public masterMgp;

    ISwapRouter public uniswapV3Router;

    uint24 public poolFee0;
    uint24 public poolFee1;

    uint256 assetWombatDm;

    JoeRouterV3 public traderJoeRouter;

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
        daiPlus = IERC20(params.daiPlus);
        usdt = IERC20(params.usdt);
        usdc = IERC20(params.usdc);
        weth = IERC20(params.weth);
        wom = IERC20(params.wom);
        mgp = IERC20(params.mgp);
        mgpLp = IERC20(params.mgpLp);

        stakingWombat = params.stakingWombat;
        poolHelperMgp = MagpiePoolHelper(params.poolHelperMgp);
        masterMgp = MasterMagpie(params.masterMgp);
        poolWombat = IWombatPool(params.poolWombat);
        basePoolWombat = IWombatPool(params.basePoolWombat);
        router = IWombatRouter(params.routerWombat);

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolFee0 = params.poolFee0;
        poolFee1 = params.poolFee1;

        assetWombatDm = 1e18;

        traderJoeRouter = JoeRouterV3(params.traderJoeRouter);

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

        _swapAllToken0ToToken1(dai, daiPlus);

        uint256 daiPlusAmount = daiPlus.balanceOf(address(this));

        // add liquidity
        (uint256 assetAmount,) = poolWombat.quotePotentialDeposit(address(daiPlus), daiPlusAmount);

        daiPlus.approve(address(stakingWombat), daiPlusAmount);
        poolHelperMgp.deposit(daiPlusAmount, OvnMath.subBasisPoints(assetAmount, 1));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        // get amount to unstake
        (uint256 daiPlusAmountOneAsset,) = poolWombat.quotePotentialWithdraw(address(daiPlus), assetWombatDm);
        // add 1bp for smooth withdraw
        uint256 assetAmount = OvnMath.addBasisPoints(_amount, swapSlippageBP) * assetWombatDm / daiPlusAmountOneAsset;
        uint256 assetBalance = poolHelperMgp.balance(address(this));
        if (assetAmount > assetBalance) {
            assetAmount = assetBalance;
        }

        // unstake
        poolHelperMgp.withdraw(assetAmount, _amount);

        _swapAllToken0ToToken1(daiPlus, dai);

        return dai.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 assetBalance = poolHelperMgp.balance(address(this));
        poolHelperMgp.withdraw(assetBalance, _totalValue(false));

        _swapAllToken0ToToken1(daiPlus, dai);

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
        daiBalance += daiPlus.balanceOf(address(this));

        uint256 assetBalance = poolHelperMgp.balance(address(this));
        if (assetBalance > 0) {
            (uint256 daiPlusAmount,) = poolWombat.quotePotentialWithdraw(address(daiPlus), assetBalance);
            daiBalance += daiPlusAmount;
        }

        return daiBalance;
    }


    function _claimRewards(address _to) internal override returns (uint256) {

        if (poolHelperMgp.balance(address(this)) == 0) {
            return 0;
        }

        address[] memory stakingRewards = new address[](1);
        stakingRewards[0] = address(mgpLp);


        address[] memory tokens = new address[](2);
        tokens[0] = address(wom);
        tokens[1] = address(mgp);

        address[][] memory rewardTokens = new address [][](1);
        rewardTokens[0] = tokens;

        masterMgp.multiclaimSpec(stakingRewards, rewardTokens);

        // sell rewards
        uint256 daiBefore = dai.balanceOf(address(this));

        uint256 womBalance = wom.balanceOf(address(this));
        if (womBalance > 0) {

            UniswapV3Library.multiSwap(
                uniswapV3Router,
                address(wom),
                address(usdt),
                address(dai),
                poolFee0,
                poolFee1,
                address(this),
                womBalance,
                0
            );

        }

        uint256 mgpBalance = mgp.balanceOf(address(this));
        if (mgpBalance > 0) {

            IERC20[] memory tokenPath = new IERC20[](3);
            tokenPath[0] = mgp;
            tokenPath[1] = weth;
            tokenPath[2] = dai;

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

            traderJoeRouter.swapExactTokensForTokens(
                mgpBalance,
                0,
                path,
                address(this),
                block.timestamp
            );

        }


        uint256 totalDai = dai.balanceOf(address(this)) - daiBefore;

        if (totalDai > 0) {
            dai.transfer(_to, totalDai);
        }

        return totalDai;
    }

}
