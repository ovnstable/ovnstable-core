// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;


interface IPendleBooster {

    function deposit(uint256 _pid, uint256 _amount, bool _stake) external;

    function withdraw(uint256 _pid, uint256 _amount) external;


}

interface IBaseRewardPool {

    function balanceOf(address account) external view returns (uint256);

    function getReward(address _account) external;
    function withdrawFor(address _account, uint256 _amount) external;

}

interface IEqbZap {

    function withdraw(uint256 _pid, uint256 _amount) external;

}
