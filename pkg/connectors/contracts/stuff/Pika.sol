// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

interface VaultFeeReward {

    function claimReward() external returns(uint256 rewardToSend);

    function claimReward(address user) external returns(uint256 rewardToSend);

}

interface VaultTokenReward {

    function earned(address account) external view returns (uint256);

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

    struct Vault {
        // 32 bytes
        uint128 cap; // Maximum capacity. 16 bytes
        uint128 balance; // 16 bytes
        // 32 bytes
        uint96 staked; // Total staked by users. 12 bytes
        uint96 shares; // Total ownership shares. 12 bytes
        uint64 stakingPeriod; // Time required to lock stake (seconds). 8 bytes
    }


    function redeem(
        address user,
        uint256 shares,
        address receiver
    ) external;


    function getShare(address stakeOwner) external view returns(uint256);

    function getTotalShare() external view returns(uint256);

    function getStake(address stakeOwner) external view returns(Stake memory);
    function getVault() external view returns(Vault memory);

    function stake(uint256 amount, address user) external;
}


interface PikaPerpV4 {

    struct Stake {
        // 32 bytes
        address owner; // 20 bytes
        uint96 amount; // 12 bytes
        // 32 bytes
        uint128 shares; // 16 bytes
        uint128 timestamp; // 16 bytes
    }

    struct Vault {
        // 32 bytes
        uint128 cap; // Maximum capacity. 16 bytes
        uint128 balance; // 16 bytes
        // 32 bytes
        uint96 staked; // Total staked by users. 12 bytes
        uint96 shares; // Total ownership shares. 12 bytes
        uint64 stakingPeriod; // Time required to lock stake (seconds). 8 bytes
    }


    function redeem(
        address user,
        uint256 shares,
        address receiver
    ) external;


    function getShare(address stakeOwner) external view returns(uint256);

    function getTotalShare() external view returns(uint256);

    function getStake(address stakeOwner) external view returns(Stake memory);
    function getVault() external view returns(Vault memory);

    function stake(uint256 amount, address user) external;
}

interface IPikaVester {

    struct UserInfo {
        uint256 initialDepositAmount;
        uint256 depositAmount;
        uint256 vestedUntil;
        uint256 vestingStartTime;
    }

    struct DepositVestingStatus {
        uint256 depositId;
        uint256 initialDepositAmount;
        uint256 depositAmount;
        uint256 claimableAmount;
        uint256 vestedUntil;
        uint256 vestingStartTime;
    }

    /**
     * @notice Deposit esPIKA for vesting.
     */
    function deposit(uint256 _amount) external;

    /**
     * @notice Deposit esPIKA to vest for _to address.
     */
    function depositFor(uint256 _amount, address _to) external;

    /**
     * @notice Withdraw the deposited esPIKA. The vesting is reset for the withdrawn amount.
     */
    function withdraw(uint256 _amount, uint256 _depositId) external;

    /**
     * @notice Claim PIKA token from vesting. If the vesting is not completed, it is attached a fee,
     * which decreases linearly to 0 at the vesting completion time. The deposited esPIKA token is burned and
     * the fee is transferred to the treasury.
     */
    function claim(uint256 _depositId) external;

    function claimAll() external;

    function claimable(address _account, uint256 _depositId) external view returns(uint256);

    function claimableAll(address _account) external view returns(uint256 claimableAmount);

    function unvested(address _account, uint256 _depositId) external view returns(uint256);

    function unvestedAll(address _account) view external returns(uint256);

    function initialDeposited(address _account, uint256 _depositId) external view returns(uint256);

    function initialDepositedAll(address _account) external view returns(uint256 initialDepositedAllAmount);

    function deposited(address _account, uint256 _depositId) external view returns(uint256);

    function depositedAll(address _account) external view returns(uint256 depositedAllAmount);

    function getAllUserDepositIds(address _user) external view returns (uint256[] memory);

    function getVestingStatus(address _user, uint256 _depositId) external view returns(DepositVestingStatus memory);

    function getVestingStatuses(address _user) external view returns(DepositVestingStatus[] memory);
}