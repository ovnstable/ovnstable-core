// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IPenLens {

    /* ========== PUBLIC VARS ========== */

    function penPoolFactoryAddress() external view returns (address);

    function rewardsDistributorAddress() external view returns (address);

    function userProxyFactoryAddress() external view returns (address);

    function dystopiaLensAddress() external view returns (address);

    function penAddress() external view returns (address);

    function vlPenAddress() external view returns (address);

    function penDystAddress() external view returns (address);

    function voterProxyAddress() external view returns (address);

    function veAddress() external view returns (address);

    function dystAddress() external view returns (address);

    function penDystRewardsPoolAddress() external view returns (address);

    function partnersRewardsPoolAddress() external view returns (address);

    function treasuryAddress() external view returns (address);

    function cvlPenAddress() external view returns (address);

    function penV1RewardsAddress() external view returns (address);

    function penV1RedeemAddress() external view returns (address);

    function penV1Address() external view returns (address);

    function tokensAllowlistAddress() external view returns (address);

    /* ========== PUBLIC VIEW FUNCTIONS ========== */

    function voterAddress() external view returns (address);

    function poolsFactoryAddress() external view returns (address);

    function gaugesFactoryAddress() external view returns (address);

    function minterAddress() external view returns (address);

    function penPoolsLength() external view returns (uint256);

    function userProxiesLength() external view returns (uint256);

    function userProxyByAccount(address accountAddress)
    external
    view
    returns (address);

    function userProxyByIndex(uint256 index) external view returns (address);

    function gaugeByDystPool(address) external view returns (address);

    function dystPoolByPenPool(address penPoolAddress)
    external
    view
    returns (address);

    function penPoolByDystPool(address dystPoolAddress)
    external
    view
    returns (address);

    function stakingRewardsByDystPool(address dystPoolAddress)
    external
    view
    returns (address);

    function stakingRewardsByPenPool(address dystPoolAddress)
    external
    view
    returns (address);

    function isPenPool(address penPoolAddress) external view returns (bool);

    function penPoolsAddresses() external view returns (address[] memory);

    function isPartner(address userProxyAddress) external view returns (bool);

    function stakedPenDystBalanceOf(address accountAddress)
    external
    view
    returns (uint256 stakedBalance);

    function dystInflationSinceInception() external view returns (uint256);
}