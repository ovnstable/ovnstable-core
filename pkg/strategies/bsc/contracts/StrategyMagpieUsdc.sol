// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombat.sol";
import "@overnight-contracts/connectors/contracts/stuff/Magpie.sol";
import "@overnight-contracts/connectors/contracts/stuff/PancakeV2.sol";
import "@overnight-contracts/connectors/contracts/stuff/PancakeV3.sol";


contract StrategyMagpieUsdc is Strategy {

    // --- structs

    struct StrategyParams {
        address usdc;
        address busd;
        address usdt;
        address wBnb;
        address wom;
        address mgp;
        address poolHelperMgp;
        address pancakeRouter;
        address pancakeSwapV3Router;
    }

    // --- params

    IERC20 public usdc;
    IERC20 public busd;
    IERC20 public usdt;
    IERC20 public wBnb;
    IERC20 public wom;
    IERC20 public mgp;

    MagpiePoolHelper public poolHelperMgp;

    address public pancakeRouter;
    address public pancakeSwapV3Router;

    IWombatPool public poolWombat;
    uint256 public assetWombatDm;

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
        busd = IERC20(params.busd);
        usdt = IERC20(params.usdt);
        wBnb = IERC20(params.wBnb);
        wom = IERC20(params.wom);
        mgp = IERC20(params.mgp);

        poolHelperMgp = MagpiePoolHelper(params.poolHelperMgp);

        pancakeRouter = params.pancakeRouter;
        pancakeSwapV3Router = params.pancakeSwapV3Router;

        poolWombat = IWombatPool(IWombatAsset(poolHelperMgp.lpToken()).pool());
        assetWombatDm = 10 ** IERC20Metadata(poolHelperMgp.lpToken()).decimals();

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        (uint256 assetAmount,) = poolWombat.quotePotentialDeposit(address(usdc), _amount);

        usdc.approve(poolHelperMgp.wombatStaking(), _amount);
        poolHelperMgp.deposit(_amount, OvnMath.subBasisPoints(assetAmount, 1));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        // get amount to unstake
        (uint256 usdcAmountOneAsset,) = poolWombat.quotePotentialWithdraw(address(usdc), assetWombatDm);
        // add 1bp for smooth withdraw
        uint256 assetAmount = OvnMath.addBasisPoints(_amount, swapSlippageBP) * assetWombatDm / usdcAmountOneAsset;
        uint256 assetBalance = poolHelperMgp.balance(address(this));
        if (assetAmount > assetBalance) {
            assetAmount = assetBalance;
        }

        poolHelperMgp.withdraw(assetAmount, _amount);

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 assetBalance = poolHelperMgp.balance(address(this));
        (uint256 usdcAmount,) = poolWombat.quotePotentialWithdraw(address(usdc), assetBalance);

        poolHelperMgp.withdraw(assetBalance, OvnMath.subBasisPoints(usdcAmount, 1));

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

        uint256 assetBalance = poolHelperMgp.balance(address(this));
        assetBalance += IWombatAsset(poolHelperMgp.lpToken()).balanceOf(address(this));
        if (assetBalance > 0) {
            (uint256 usdcAmount,) = poolWombat.quotePotentialWithdraw(address(usdc), assetBalance);
            usdcBalance += usdcAmount;
        }

        return usdcBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        if (poolHelperMgp.balance(address(this)) > 0) {

            // harvest wom rewards
            poolHelperMgp.harvest();

            address[] memory stakingRewards = new address[](1);
            stakingRewards[0] = poolHelperMgp.stakingToken();

            address[] memory tokens = new address[](2);
            tokens[0] = address(wom);
            tokens[1] = address(mgp);

            address[][] memory rewardTokens = new address[][](1);
            rewardTokens[0] = tokens;

            MasterMagpie(poolHelperMgp.masterMagpie()).multiclaimSpec(stakingRewards, rewardTokens);
        }

        // sell rewards
        uint256 totalUsdc;

        uint256 womBalance = wom.balanceOf(address(this));
        if (womBalance > 0) {
            uint256 womAmount = PancakeSwapLibrary.getAmountsOut(
                IPancakeRouter02(pancakeRouter),
                address(wom),
                address(busd),
                address(usdc),
                womBalance
            );

            if (womAmount > 0) {
                uint256 womUsdc = PancakeSwapLibrary.swapExactTokensForTokens(
                    IPancakeRouter02(pancakeRouter),
                    address(wom),
                    address(busd),
                    address(usdc),
                    womBalance,
                    womAmount * 99 / 100,
                    address(this)
                );
                totalUsdc += womUsdc;
            }
        }

        uint256 mgpBalance = mgp.balanceOf(address(this));
        if (mgpBalance > 0) {
            uint256 mgpUsdc = PancakeSwapV3Library.pathSwap(
                pancakeSwapV3Router,
                address(mgp),
                abi.encodePacked(address(mgp), uint24(2500), address(wBnb), uint24(500), address(usdt), uint24(100), address(usdc)),
                address(this),
                mgpBalance,
                0
            );
            totalUsdc += mgpUsdc;
        }

        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

    function stakeLPTokens() external onlyAdmin {
        uint256 assetBalance = IWombatAsset(poolHelperMgp.lpToken()).balanceOf(address(this));
        if (assetBalance > 0) {
            IWombatAsset(poolHelperMgp.lpToken()).approve(address(poolHelperMgp.wombatStaking()), assetBalance);
            poolHelperMgp.depositLP(assetBalance);
        }
    }
}
