// SPDX-License-Identifier: MIT
pragma solidity >=0.5 <0.9.0;

interface IMeshSwapUsdc {

    function depositToken(uint256 _amount) external;

    function withdrawToken(uint256 withdrawAmount) external;

    function claimReward() external;

}
