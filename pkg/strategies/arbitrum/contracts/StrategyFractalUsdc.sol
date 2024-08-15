// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Fractal.sol";
import "hardhat/console.sol";

contract StrategyFractalUsdc is Strategy {

    // --- params

    IERC20 public usdc;
    ISubAccount public subAccount;

    // --- events

    event StrategyUpdatedParams();

    // --- structs

    struct StrategyParams {
        address usdc;
        address subAccount;
    }

    // --- constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }

    // --- setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        require(params.usdc != address(0), "Zero address not allowed");
        require(params.subAccount != address(0), "Zero address not allowed");

        usdc = IERC20(params.usdc);
        subAccount = ISubAccount(params.subAccount);

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        console.log("totalValue before: %s", _totalValue());
        uint256 usdcBalance = usdc.balanceOf(address(this));
        console.log("usdcBalance before: %s", usdcBalance);
        subAccount.deployToStrategy(usdc, usdcBalance, usdcBalance);
        console.log("usdcBalance after: %s", usdc.balanceOf(address(this)));
        console.log("totalValue after: %s", _totalValue());
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        console.log("totalValue before: %s", _totalValue());
        console.log("usdcBalance before: %s", usdc.balanceOf(address(this)));
        subAccount.withdrawFromStrategy(usdc, _amount, _amount);
        console.log("usdcBalance after: %s", usdc.balanceOf(address(this)));
        console.log("totalValue after: %s", _totalValue());

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        console.log("usdcBalance before: %s", usdc.balanceOf(address(this)));
        uint256 totalValue = _totalValue();
        console.log("totalValue: %s", totalValue);
        subAccount.withdrawFromStrategy(usdc, totalValue, totalValue);
        console.log("usdcBalance after: %s", usdc.balanceOf(address(this)));

        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return usdc.balanceOf(address(subAccount)) + usdc.balanceOf(subAccount.activeStrategy());
    }

    function _claimRewards(address _to) internal override returns (uint256) {
        return 0;
    }

}
