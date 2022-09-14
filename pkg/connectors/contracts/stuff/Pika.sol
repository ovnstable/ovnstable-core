// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

interface VaultFeeReward {

    function claimReward() external returns(uint256 rewardToSend);

}

interface VaultTokenReward {
    function getReward() external;

}

interface PikaPerpV3 {

    struct Stake {
        // 32 bytes
        address owner; // 20 bytes
        uint96 amount; // 12 bytes
        // 32 bytes
        uint128 shares; // 16 bytes
        uint128 timestamp; // 16 bytes
    }

    function redeem(
        address user,
        uint256 shares,
        address receiver
    ) external;


    function getShare(address stakeOwner) external view returns(uint256);


    function getStake(address stakeOwner) external view returns(Stake memory);

    function stake(uint256 amount, address user) external;
}

