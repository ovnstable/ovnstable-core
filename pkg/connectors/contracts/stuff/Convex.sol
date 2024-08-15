// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/*
This is the main contract which will have operator role on the VoterProxy.
Handles pool creation, deposits/withdraws, as well as other managment functions like factories/managers/fees
*/
interface IBooster {

    //deposit lp tokens and stake
    function deposit(uint256 _pid, uint256 _amount) external returns(bool);

    //deposit all lp tokens and stake
    function depositAll(uint256 _pid) external returns(bool);

    //given an amount of crv, calculate fees
    function calculatePlatformFees(uint256 _amount) external view returns(uint256);
}

//claim and distribute gauge rewards without need of harvesters
//more gas cost but no delayed rewards
//
//Reward distro based on Curve.fi's gauge wrapper implementations at https://github.com/curvefi/curve-dao-contracts/tree/master/contracts/gauges/wrappers
interface IConvexRewardPool is IERC20Metadata {

    //get reward count
    function rewardLength() external view returns(uint256);

    //manually checkpoint a user account
    function user_checkpoint(address _account) external returns(bool);

    //set any claimed rewards to automatically go to a different address
    //set address to zero to disable
    function setRewardRedirect(address _to) external;

    //claim reward for given account (unguarded)
    function getReward(address _account) external;

    //claim reward for given account and forward (guarded)
    function getReward(address _account, address _forwardTo) external;

    //withdraw balance and unwrap to the underlying lp token
    function withdraw(uint256 _amount, bool _claim) external returns(bool);

    //withdraw balance and unwrap to the underlying lp token
    //but avoid checkpointing.  will lose non-checkpointed rewards but can withdraw
    function emergencyWithdraw(uint256 _amount) external returns(bool);

    //withdraw full balance
    function withdrawAll(bool claim) external;
}