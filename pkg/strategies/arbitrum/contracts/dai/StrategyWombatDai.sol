// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombat.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";


contract StrategyWombatDai is Strategy {

    // --- structs

    struct StrategyParams {
        address dai;
        address usdt;
        address wom;
        address assetWombat;
        address poolWombat;
        address masterWombat;
        address uniswapV3Router;
        uint24 poolFee0;
        uint24 poolFee1;
    }

    // --- params

    IERC20 public dai;
    IERC20 public usdt;
    IERC20 public wom;

    IAsset public assetWombat;
    uint256 public assetWombatDm;
    IPool public poolWombat;
    IMasterWombatV2 public masterWombat;
    ISwapRouter public uniswapV3Router;

    uint24 public poolFee0;
    uint24 public poolFee1;


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
        wom = IERC20(params.wom);

        assetWombat = IAsset(params.assetWombat);
        poolWombat = IPool(params.poolWombat);
        masterWombat = IMasterWombatV2(params.masterWombat);

        uniswapV3Router  = ISwapRouter(params.uniswapV3Router);
        poolFee0 = params.poolFee0;
        poolFee1 = params.poolFee1;

        assetWombatDm = 10 ** IERC20Metadata(params.assetWombat).decimals();

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
        uint256 pid = masterWombat.getAssetPid(address(assetWombat));
        uint256 assetBalance = assetWombat.balanceOf(address(this));
        assetWombat.approve(address(masterWombat), assetBalance);
        masterWombat.deposit(pid, assetBalance);
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
        uint256 pid = masterWombat.getAssetPid(address(assetWombat));
        (uint128 assetBalance,,,) = masterWombat.userInfo(pid, address(this));
        if (assetAmount > assetBalance) {
            assetAmount = assetBalance;
        }

        // unstake
        masterWombat.withdraw(pid, assetAmount);

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

        require(_asset == address(dai), "Some token not compatible");

        // get amount to unstake
        uint256 pid = masterWombat.getAssetPid(address(assetWombat));
        (uint128 assetBalance,,,) = masterWombat.userInfo(pid, address(this));

        // unstake
        masterWombat.withdraw(pid, assetBalance);

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

        uint256 pid = masterWombat.getAssetPid(address(assetWombat));
        (uint128 assetBalance,,,) = masterWombat.userInfo(pid, address(this));
        if (assetBalance > 0) {
            if (nav) {
                (uint256 daiAmountOneAsset,) = poolWombat.quotePotentialWithdraw(address(dai), assetWombatDm);
                daiBalance += assetBalance * daiAmountOneAsset / assetWombatDm;
            } else {
                (uint256 daiAmount,) = poolWombat.quotePotentialWithdraw(address(dai), assetBalance);
                daiBalance += daiAmount;
            }
        }

        return daiBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        uint256 pid = masterWombat.getAssetPid(address(assetWombat));
        (uint128 assetBalance,,,) = masterWombat.userInfo(pid, address(this));
        if (assetBalance > 0) {
            masterWombat.deposit(pid, 0);
        }

        // sell rewards
        uint256 totalDai;

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

            totalDai += amountOut;
        }

        if (totalDai > 0) {
            dai.transfer(_to, totalDai);
        }

        return totalDai;
    }

}
