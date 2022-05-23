// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../interfaces/IStrategy.sol";


contract MockStrategy is IStrategy {

    IERC20 public usdcToken;

    // --- Setters

    constructor(address _usdcToken, uint256 nonce)  {
        require(_usdcToken != address(0), "Zero address not allowed");
        usdcToken = IERC20(_usdcToken);
    }


    // --- logic

    function stake(
        address _asset,
        uint256 _amount
    ) external override {
        return;
    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary,
        bool targetIsZero
    ) external override returns (uint256) {
        uint256 balance = usdcToken.balanceOf(address(this));
        if (targetIsZero) {
            usdcToken.transfer(_beneficiary, balance);
            return balance;
        } else {
            require(balance >= _amount, "MockStrategy: unstake more than balance");
            usdcToken.transfer(_beneficiary, _amount);
            return _amount;
        }
    }


    function netAssetValue() external view override returns (uint256) {
        return usdcToken.balanceOf(address(this));
    }

    function liquidationValue() external view override returns (uint256) {
        return usdcToken.balanceOf(address(this));
    }

    function claimRewards(address _to) external override returns (uint256) {
        usdcToken.transfer(_to, 1e6);
        return 1e6;
    }

    function healthFactorBalance() external override {
        return;
    }
}
