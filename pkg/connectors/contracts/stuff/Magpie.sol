// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface MagpiePoolHelper {

    function lpToken() external view returns (address);

    function balance(address _address) external view returns (uint256);

    function deposit(uint256 amount, uint256 minimumAmount) external;

    function depositLP(uint256 amount) external;

    function depositNative(uint256 amount, uint256 minimumAmount) external payable;

    function harvest() external;

    function withdraw(uint256 amount, uint256 minimumAmount) external;
}

interface MasterMagpie {

    function multiclaimSpec(address[] memory _stakingTokens,address[][] memory _rewardTokens) external;
}
