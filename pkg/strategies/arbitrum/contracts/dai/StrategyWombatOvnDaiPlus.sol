// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombat.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/connectors/contracts/stuff/Camelot.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombex.sol";

/**
 * @dev Self-investment strategy
 * 1) Buy DAI+ by next routing: (DAI->USDC->DAI+) (base pool wombat->ovn pool wombat)
 * 2) invest DAI+ to Overnight pool on Wombat
 * 3) Stake lp tokens in Wombex
 *
 * Sell rewards:
 * - WOM on UniswapV3
 * - WMX on Camelot
 *
 */

contract StrategyWombatOvnDaiPlus is Strategy {

    // --- structs

    struct StrategyParams {
        address dai;
        address daiPlus;
        address usdt;
        address usdc;
        address wom;
        address wmx;
        address assetWombat;
        address poolWombat;
        address basePoolWombat;
        address wombatRouter;
        address uniswapV3Router;
        uint24 poolFee0;
        uint24 poolFee1;
        address wombexBooster;
        uint256 wombexBoosterPid;
        address wombexVault;
        address camelotRouter;
    }

    // --- params

    IERC20 public dai;
    IERC20 public daiPlus;
    IERC20 public usdt;
    IERC20 public wom;

    IWombatAsset public assetWombat;
    uint256 public assetWombatDm;
    IWombatPool public basePoolWombat;
    IWombatPool public poolWombat; // ovn pool
    IWombatRouter public router;
    ISwapRouter public uniswapV3Router;

    uint24 public poolFee0;
    uint24 public poolFee1;

    IWombexBooster public wombexBooster;
    uint256 public wombexBoosterPid;
    IWombexVault public wombexVault;
    IERC20 public wmx;
    IERC20 public usdc;

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
        dai = IERC20(params.dai);
        daiPlus = IERC20(params.daiPlus);
        usdt = IERC20(params.usdt);
        usdc = IERC20(params.usdc);
        wom = IERC20(params.wom);
        wmx = IERC20(params.wmx);

        assetWombat = IWombatAsset(params.assetWombat);
        poolWombat = IWombatPool(params.poolWombat);
        basePoolWombat = IWombatPool(params.basePoolWombat);
        router = IWombatRouter(params.wombatRouter);

        uniswapV3Router  = ISwapRouter(params.uniswapV3Router);
        poolFee0 = params.poolFee0;
        poolFee1 = params.poolFee1;

        assetWombatDm = 10 ** IERC20Metadata(params.assetWombat).decimals();

        wombexBooster = IWombexBooster(params.wombexBooster);
        wombexBoosterPid = params.wombexBoosterPid;
        wombexVault = IWombexVault(params.wombexVault);

        camelotRouter = ICamelotRouter(params.camelotRouter);

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _swapDaiToDaiPlus() internal {

        uint256 amountToSwap = dai.balanceOf(address(this));

        address[] memory tokenPath = new address[](3);
        tokenPath[0] = address(dai);
        tokenPath[1] = address(usdc);
        tokenPath[2] = address(daiPlus);

        address[] memory poolPath = new address[](2);
        poolPath[0] = address(basePoolWombat);
        poolPath[1] = address(poolWombat);

        uint256 amountOut = WombatLibrary.getMultiAmountOut(
            router,
            tokenPath,
            poolPath,
            amountToSwap
        );

        if (amountOut > 0) {
            WombatLibrary.multiSwap(
                router,
                tokenPath,
                poolPath,
                amountToSwap,
                0,
                address(this)
            );
        }
    }

    function _swapDaiPlusToDai() internal {

        uint256 amountToSwap = daiPlus.balanceOf(address(this));

        address[] memory tokenPath = new address[](3);
        tokenPath[0] = address(daiPlus);
        tokenPath[1] = address(usdc);
        tokenPath[2] = address(dai);

        address[] memory poolPath = new address[](2);
        poolPath[0] = address(poolWombat);
        poolPath[1] = address(basePoolWombat);

        uint256 amountOut = WombatLibrary.getMultiAmountOut(
            router,
            tokenPath,
            poolPath,
            amountToSwap
        );

        if (amountOut > 0) {
            WombatLibrary.multiSwap(
                router,
                tokenPath,
                poolPath,
                amountToSwap,
                0,
                address(this)
            );
        }
    }



    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        // Swap all DAI -> DAI+
        _swapDaiToDaiPlus();

        uint256 daiPlusBalance = daiPlus.balanceOf(address(this));

        // add liquidity
        (uint256 assetAmount,) = poolWombat.quotePotentialDeposit(address(daiPlus), daiPlusBalance);
        daiPlus.approve(address(poolWombat), daiPlusBalance);
        poolWombat.deposit(
            address(daiPlus),
            daiPlusBalance,
            OvnMath.subBasisPoints(assetAmount, stakeSlippageBP),
            address(this),
            block.timestamp,
            false
        );

        // stake
        uint256 assetBalance = assetWombat.balanceOf(address(this));
        assetWombat.approve(address(wombexBooster), assetBalance);
        wombexBooster.deposit(wombexBoosterPid, assetBalance, true);
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
        uint256 assetBalance = wombexVault.balanceOf(address(this));
        if (assetAmount > assetBalance) {
            assetAmount = assetBalance;
        }

        // unstake
        wombexVault.withdrawAndUnwrap(assetAmount, false);

        // remove liquidity
        assetWombat.approve(address(poolWombat), assetAmount);
        poolWombat.withdraw(
            address(daiPlus),
            assetAmount,
            _amount,
            address(this),
            block.timestamp
        );

        _swapDaiPlusToDai();

        return dai.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        // get amount to unstake
        uint256 assetBalance = wombexVault.balanceOf(address(this));

        // unstake
        wombexVault.withdrawAndUnwrap(assetBalance, false);

        // remove liquidity
        (uint256 daiPlusAmount,) = poolWombat.quotePotentialWithdraw(address(daiPlus), assetBalance);
        assetWombat.approve(address(poolWombat), assetBalance);
        poolWombat.withdraw(
            address(daiPlus),
            assetBalance,
            OvnMath.subBasisPoints(daiPlusAmount, 1),
            address(this),
            block.timestamp
        );

        _swapDaiPlusToDai();

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

        uint256 assetBalance = wombexVault.balanceOf(address(this));
        if (assetBalance > 0) {
            (uint256 daiPlusAmount,) = poolWombat.quotePotentialWithdraw(address(daiPlus), assetBalance);
            daiBalance += daiPlusAmount;
        }

        return daiBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        wombexVault.getReward(address(this), false);

        uint256 daiBefore = dai.balanceOf(address(this));

        uint256 womBalance = wom.balanceOf(address(this));
        if (womBalance > 0) {

            uint256 amountOut = UniswapV3Library.multiSwap(
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

        uint256 wmxBalance = wmx.balanceOf(address(this));
        if (wmxBalance > 0) {

            address[] memory path = new address[](4);
            path[0] = address(wmx);
            path[1] = address(usdt);
            path[2] = address(usdc);
            path[3] = address(dai);

            uint256 amountOut = CamelotLibrary.getAmountsOut(
                camelotRouter,
                path,
                wmxBalance
            );

            if (amountOut > 0) {
                CamelotLibrary.pathSwap(
                    camelotRouter,
                    path,
                    wmxBalance,
                    amountOut * 99 / 100,
                    address(this)
                );
            }

        }

        uint256 totalDai = dai.balanceOf(address(this)) - daiBefore;

        if (totalDai > 0) {
            dai.transfer(_to, totalDai);
        }

        return totalDai;
    }

}
