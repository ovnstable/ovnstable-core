// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombat.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";

contract StrategyWombatUsdc is Strategy {

    // --- structs

    struct StrategyParams {
        address usdc;
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

    IERC20 public usdc;
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
        usdc = IERC20(params.usdc);
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
        (uint256 assetAmount,) = poolWombat.quotePotentialDeposit(address(usdc), _amount);
        usdc.approve(address(poolWombat), _amount);
        poolWombat.deposit(
            address(usdc),
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
        (uint256 usdcAmountOneAsset,) = poolWombat.quotePotentialWithdraw(address(usdc), assetWombatDm);
        // add 1bp for smooth withdraw
        uint256 assetAmount = OvnMath.addBasisPoints(_amount, 1) * assetWombatDm / usdcAmountOneAsset;
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
            address(usdc),
            assetAmount,
            _amount,
            address(this),
            block.timestamp
        );

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdc), "Some token not compatible");

        // get amount to unstake
        uint256 pid = masterWombat.getAssetPid(address(assetWombat));
        (uint128 assetBalance,,,) = masterWombat.userInfo(pid, address(this));

        // unstake
        masterWombat.withdraw(pid, assetBalance);

        // remove liquidity
        (uint256 usdcAmount,) = poolWombat.quotePotentialWithdraw(address(usdc), assetBalance);
        assetWombat.approve(address(poolWombat), assetBalance);
        poolWombat.withdraw(
            address(usdc),
            assetBalance,
            // 1bp slippage
            OvnMath.subBasisPoints(usdcAmount, 1),
            address(this),
            block.timestamp
        );

        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 usdcBalance = usdc.balanceOf(address(this));

        uint256 pid = masterWombat.getAssetPid(address(assetWombat));
        (uint128 assetBalance,,,) = masterWombat.userInfo(pid, address(this));
        if (assetBalance > 0) {
            if (nav) {
                (uint256 usdcAmountOneAsset,) = poolWombat.quotePotentialWithdraw(address(usdc), assetWombatDm);
                usdcBalance += assetBalance * usdcAmountOneAsset / assetWombatDm;
            } else {
                (uint256 usdcAmount,) = poolWombat.quotePotentialWithdraw(address(usdc), assetBalance);
                usdcBalance += usdcAmount;
            }
        }

        return usdcBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        uint256 pid = masterWombat.getAssetPid(address(assetWombat));
        (uint128 assetBalance,,,) = masterWombat.userInfo(pid, address(this));
        if (assetBalance > 0) {
            masterWombat.deposit(pid, 0);
        }

        // sell rewards
        uint256 totalUsdc;

        uint256 womBalance = wom.balanceOf(address(this));
        if (womBalance > 0) {

            uint256 amountOut = UniswapV3Library.multiSwap(
                uniswapV3Router,
                address(wom),
                address(usdt),
                address(usdc),
                poolFee0,
                poolFee1,
                address(this),
                womBalance,
                0
            );

            totalUsdc += amountOut;
        }

        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

}
