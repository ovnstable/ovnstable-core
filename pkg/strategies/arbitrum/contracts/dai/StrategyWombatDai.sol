// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombat.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/connectors/contracts/stuff/Camelot.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombex.sol";

contract StrategyWombatDai is Strategy {

    // --- structs

    struct StrategyParams {
        address dai;
        address usdt;
        address usdc;
        address wom;
        address wmx;
        address assetWombat;
        address poolWombat;
        address masterWombat;
        address uniswapV3Router;
        uint24 poolFee0;
        uint24 poolFee1;
        address wombexBooster;
        uint256 wombexBoosterPid;
        address wombexVault;
        address camelorRouter;
    }

    // --- params

    IERC20 public dai;
    IERC20 public usdt;
    IERC20 public wom;

    IWombatAsset public assetWombat;
    uint256 public assetWombatDm;
    IWombatPool public poolWombat;
    IMasterWombatV2 public masterWombat;
    ISwapRouter public uniswapV3Router;

    uint24 public poolFee0;
    uint24 public poolFee1;

    IWombexBooster public wombexBooster;
    uint256 public wombexBoosterPid;
    IWombexVault public wombexVault;
    IERC20 public wmx;
    IERC20 public usdc;

    ICamelotRouter public camelorRouter;


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
        usdt = IERC20(params.usdt);
        usdc = IERC20(params.usdc);
        wom = IERC20(params.wom);
        wmx = IERC20(params.wmx);

        assetWombat = IWombatAsset(params.assetWombat);
        poolWombat = IWombatPool(params.poolWombat);
        masterWombat = IMasterWombatV2(params.masterWombat);

        uniswapV3Router  = ISwapRouter(params.uniswapV3Router);
        poolFee0 = params.poolFee0;
        poolFee1 = params.poolFee1;

        assetWombatDm = 10 ** IERC20Metadata(params.assetWombat).decimals();

        wombexBooster = IWombexBooster(params.wombexBooster);
        wombexBoosterPid = params.wombexBoosterPid;
        wombexVault = IWombexVault(params.wombexVault);

        camelorRouter = ICamelotRouter(params.camelorRouter);

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        // add liquidity
        (uint256 assetAmount,) = poolWombat.quotePotentialDeposit(address(dai), _amount);
        dai.approve(address(poolWombat), _amount);
        poolWombat.deposit(
            address(dai),
            _amount,
            // 1bp slippage
            OvnMath.subBasisPoints(assetAmount, 1),
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
        (uint256 daiAmountOneAsset,) = poolWombat.quotePotentialWithdraw(address(dai), assetWombatDm);
        // add 1bp for smooth withdraw
        uint256 assetAmount = OvnMath.addBasisPoints(_amount, 1) * assetWombatDm / daiAmountOneAsset;
        uint256 assetBalance = wombexVault.balanceOf(address(this));
        if (assetAmount > assetBalance) {
            assetAmount = assetBalance;
        }

        // unstake
        wombexVault.withdrawAndUnwrap(assetAmount, false);

        // remove liquidity
        assetWombat.approve(address(poolWombat), assetAmount);
        poolWombat.withdraw(
            address(dai),
            assetAmount,
            _amount,
            address(this),
            block.timestamp
        );

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
        (uint256 daiAmount,) = poolWombat.quotePotentialWithdraw(address(dai), assetBalance);
        assetWombat.approve(address(poolWombat), assetBalance);
        poolWombat.withdraw(
            address(dai),
            assetBalance,
            // 1bp slippage
            OvnMath.subBasisPoints(daiAmount, 1),
            address(this),
            block.timestamp
        );

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

        uint256 assetBalance = wombexVault.balanceOf(address(this));
        if (assetBalance > 0) {
            (uint256 daiAmount,) = poolWombat.quotePotentialWithdraw(address(dai), assetBalance);
            daiBalance += daiAmount;
        }

        return daiBalance;
    }

    function stakeAssetsToWombex() external onlyAdmin {

        // claim rewards from Wombat
        uint256 pid = masterWombat.getAssetPid(address(assetWombat));
        (uint128 assetBalance,,,) = masterWombat.userInfo(pid, address(this));
        if (assetBalance > 0) {
            masterWombat.deposit(pid, 0);
        }

        // withdraw assets from Wombat
        masterWombat.withdraw(pid, assetBalance);

        // deposit assets to Wombex
        assetWombat.approve(address(wombexBooster), assetBalance);
        wombexBooster.deposit(wombexBoosterPid, assetBalance, true);
    }


    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        wombexVault.getReward(address(this), false);

        // sell rewards
        uint256 totalDai;

        uint256 womBalance = wom.balanceOf(address(this));
        if (womBalance > 0) {
            address[] memory path = new address[](4);
            path[0] = address(wom);
            path[1] = address(usdt);
            path[2] = address(usdc);
            path[3] = address(dai);

            uint256 womAmount = CamelotLibrary.getAmountsOut(
                camelorRouter,
                path,
                womBalance
            );

            if (womAmount > 0) {
                uint256 balanceDaiBefore = dai.balanceOf(address(this));
                CamelotLibrary.pathSwap(
                    camelorRouter,
                    path,
                    womBalance,
                    womAmount * 99 / 100,
                    address(this)
                );
                uint256 womDai = dai.balanceOf(address(this)) - balanceDaiBefore;
                totalDai += womDai;
            }
        }

        uint256 wmxBalance = wmx.balanceOf(address(this));
        if (wmxBalance > 0) {

            address[] memory path = new address[](4);
            path[0] = address(wmx);
            path[1] = address(usdt);
            path[2] = address(usdc);
            path[3] = address(dai);

            uint256 amountOut = CamelotLibrary.getAmountsOut(
                camelorRouter,
                path,
                wmxBalance
            );

            if (amountOut > 0) {
                uint256 balanceDaiBefore = dai.balanceOf(address(this));
                CamelotLibrary.pathSwap(
                    camelorRouter,
                    path,
                    wmxBalance,
                    amountOut * 99 / 100,
                    address(this)
                );

                totalDai += (dai.balanceOf(address(this)) - balanceDaiBefore);
            }

        }

        if (totalDai > 0) {
            dai.transfer(_to, totalDai);
        }

        return totalDai;
    }

    function sendLPTokens(address to, uint256 bps) external onlyPortfolioAgent {
        require(to != address(0), "Zero address not allowed");
        require(bps != 0, "Zero bps not allowed");

        uint256 assetAmount = wombexVault.balanceOf(address(this)) * bps / 10000;
        if (assetAmount > 0) {
            wombexVault.withdrawAndUnwrap(assetAmount, true);
            uint256 sendAmount = assetWombat.balanceOf(address(this));
            if (sendAmount > 0) {
                assetWombat.transfer(to, sendAmount);
            }
        }
    }
}
