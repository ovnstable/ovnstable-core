// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import '@overnight-contracts/core/contracts/Strategy.sol';
import '@overnight-contracts/connectors/contracts/stuff/Silo.sol';
import '@overnight-contracts/connectors/contracts/stuff/Camelot.sol';
import '@overnight-contracts/connectors/contracts/stuff/Chainlink.sol';
import '@overnight-contracts/connectors/contracts/stuff/Angle.sol';
import '@overnight-contracts/core/contracts/interfaces/IInchSwapper.sol';

import "hardhat/console.sol";

contract StrategySiloUsdc is Strategy {
    // --- params

    IERC20 public usdc;
    ISilo public silo;
    address public siloLens;
    IERC20 public siloToken;

    uint256 public assetDm;

    // --- events

    event StrategyUpdatedParams();

    // --- structs

    struct StrategyParams {
        address usdc;
        address silo;
        address siloLens;
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() public initializer {
        __Strategy_init();
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdc = IERC20(params.usdc);
        silo = ISilo(params.silo);
        siloLens = params.siloLens;
        assetDm = 10 ** IERC20Metadata(params.usdc).decimals();
    }

    // --- logic

    function _stake(address _asset, uint256 _amount) internal override {
        uint256 amount = usdc.balanceOf(address(this));
        if (amount == 0) {
            return;
        }
        usdc.approve(address(silo), amount);
        silo.deposit(address(usdc), amount, false);
    }

    function _unstake(address _asset, uint256 _amount, address _beneficiary) internal override returns (uint256) {
        silo.withdraw(address(usdc), _amount, false);
        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(address _asset, address _beneficiary) internal override returns (uint256) {
        if (this.netAssetValue() == 0) {
            return 0;
        }

        // Need to update internal cumulative rate for recalculating full nav.
        // If you don’t do this, you’ll have pennies in nav (0.000001 for example ) left after unstakeFull
        silo.withdraw(address(usdc), 1, false);
        ISiloLens siloLens_ = ISiloLens(siloLens);

        uint256 balanceInCollateral = siloLens_.collateralBalanceOfUnderlying(silo, address(usdc), address(this));

        silo.withdraw(address(usdc), balanceInCollateral, false);

        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        ISiloLens siloLens_ = ISiloLens(siloLens);
        uint256 balanceInCollateral = siloLens_.collateralBalanceOfUnderlying(silo, address(usdc), address(this));
        uint256 balanceInCash = usdc.balanceOf(address(this));

        return balanceInCollateral + balanceInCash;
    }

    function liquidationValue() external view override returns (uint256) {
        return this.netAssetValue();
    }

    function _claimRewards(address _to) internal override returns (uint256) {
        revert("_claimRewards not implemented");
    }
}
