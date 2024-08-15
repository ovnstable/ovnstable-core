// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Radiant Loop Helper
/// @author Magpie Team
/// @notice This contract is the main contract that user will interact with in order to Loop Asset Token into Radiant . This
///         Helper will be shared among all assets on Radiant to Loop on Radpie.
interface IRadpiePoolHelper {

    /// notice get the amount of total staked LP token in master magpie
    function totalStaked(address _asset) external view returns (uint256);

    /// @notice get the total amount of shares of a user
    /// @param _asset the Pendle Asset token
    /// @param _address the user
    /// @return the amount of shares
    function balance(address _asset, address _address) external view returns (uint256);

    function depositAsset(address _asset, uint256 _amount) external payable;

    function withdrawAsset(address _asset, uint256 _amount) external;

}

/// @title RadiantStaking
/// @dev RadiantStaking is the main contract that enables user zap into DLP position on behalf on user to get boosted yield and vote.
///         RadiantStaking is the main contract interacting with Radiant Finance side
/// @author Magpie Team
interface IRadiantStaking {

    struct Pool {
        address asset; // asset on Radiant
        address rToken;
        address vdToken;
        address rewarder;
        address receiptToken;
        uint256 maxCap; // max receipt token amount
        uint256 lastActionHandled; // timestamp of ActionHandled trigged on Radiant ChefIncentive
        bool isNative;
        bool isActive;
    }

    function pools(address _asset) external view returns (Pool memory);

    /// @dev to update RDNT reward from chefIncentivesController for all rToken and vdToken of Radpie
    /// Radpie vest Clamable RDNT from Radiant every other 10 days, so shares of RDNT distributed to user
    /// should be calculated based on diff of chefIncentivesController.userBaseClaimable before and after summing pending reward into
    /// userBaseClaimable on Radiant side.
    function batchHarvestEntitledRDNT(address[] memory _assets, bool _force) external;
}

interface IRadpieReceiptToken {
    function assetPerShare() external view returns (uint256);
}

/// @title A contract for managing entitled RDNT and vestable RDNT for users
/// Entitled RDNT are the RDNT amount that Radiant Staking claim from Radiant Capital, waiting to vest
/// Vestable RDNT are the RDNT amount that Radiant Staking has started claiming

/// The flow of RDNT vesting flow.
/// 1. RDNTVestManager.nextVestedTime is the RDNT vested time for all Radpie user they start vesting their Entitled RDNT at anytime.  (timestamp: T1 - x, 0 days < x < 10 days)
/// 2. RDNTRewardManager.startVestingAll call to make RadianStaking request vesting all current claimable RDNT on Radiant.            (timestamp: T1)
/// 3. RDNTRewardManager.collectVestedRDNTAll to make RadianStaking claim all vesterd RDNT and trasnfer to RDNTVestManager            (timestamp: T1 + 90)
/// 4. User can claim their vested RDNT from RDNTVestManager                                                                          (after timestamp: T1 + 90 )
/// vesting day of RDNT for Radpie user will be:   90 < RDNT vest time < 90 + x, (0 days < x < 10 days)

/// @author Radpie Team
interface IRDNTRewardManager {

    /// @dev Returns current amount of staked tokens
    function totalStaked(address _receiptToken) external view virtual returns (uint256);

    /// @dev Returns amount of staked tokens in master Radpie by account
    /// @param _receiptToken The address of the receipt
    /// @param _account The address of the account
    function balanceOf(
        address _account,
        address _receiptToken
    ) external view virtual returns (uint256);

    /// @dev Returns the entitled RDNT per token for a specific receipt
    /// @param _receipt The address of the receipt
    function entitledPerToken(address _receipt) external view returns (uint256);

    /// @dev Returns the total entitled RDNT for a specific account
    /// @param _account The address of the account
    /// @return The total entitled RDNT for the account
    function entitledRDNT(address _account) external view returns (uint256);

    /// @dev Returns the entitled RDNT for a specific account and receipt
    /// @param _account The address of the account
    /// @param _receipt The address of the receipt
    /// @return The entitled RDNT for the account and receipt and Balance of ReceiptToken
    function entitledRDNTByReceipt(
        address _account,
        address _receipt
    ) external view returns (uint256);

    function nextVestedTime() external view returns (uint256);

    /// @dev Updates the entitled RDNTs for a specific account and receipt
    /// @param _account The address of the account
    /// @param _receipt The address of the receipt
    function updateFor(address _account, address _receipt) external;

    /// @dev Start vesting the RDNT tokens for the calling account
    function vestRDNT() external;

    /// @notice Vest a specified amount of esRDNT tokens for the calling account.
    /// @param _amount The amount of esRDNT tokens to vest.
    function vestEsRDNT(uint256 _amount) external;

    ///  @notice Redeem entitled RDNT tokens to esRDNT Tokens for the calling account.
    function redeemEntitledRDNT() external;
}