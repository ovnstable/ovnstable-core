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
}

interface IRadpieReceiptToken {

    function assetPerShare() external view returns (uint256);
}