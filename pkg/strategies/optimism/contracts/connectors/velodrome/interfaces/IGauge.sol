// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IGauge {

    /**
    * @notice Determine the prior balance for an account as of a block number
    * @dev Block number must be a finalized block or else this function will revert to prevent misinformation.
    * @param account The address of the account to check
    * @param timestamp The timestamp to get the balance at
    * @return The balance the account had as of the given block
    */
    function getPriorBalanceIndex(address account, uint timestamp) public view returns (uint);

    function getPriorSupplyIndex(uint timestamp) public view returns (uint);

    function getPriorRewardPerToken(address token, uint timestamp) public view returns (uint, uint);

    function rewardsListLength() external view returns (uint);

    // returns the last time the reward was modified or periodFinish if the reward has ended
    function lastTimeRewardApplicable(address token) public view returns (uint);

    function getReward(address account, address[] memory tokens) external;

    function rewardPerToken(address token) public view returns (uint);

    function derivedBalance(address account) public view returns (uint);

    function batchRewardPerToken(address token, uint maxRuns) external;

    /// @dev Update stored rewardPerToken values without the last one snapshot
    ///      If the contract will get "out of gas" error on users actions this will be helpful
    function batchUpdateRewardPerToken(address token, uint maxRuns) external;

    // earned is an estimation, it won't be exact till the supply > rewardPerToken calculations have run
    function earned(address token, address account) public view returns (uint);

    function depositAll(uint tokenId) external;

    function deposit(uint amount, uint tokenId) public;

    function withdrawAll() external;

    function withdraw(uint amount) public;

    function withdrawToken(uint amount, uint tokenId) public;

    function left(address token) external view returns (uint);

    function notifyRewardAmount(address token, uint amount) external;

    function swapOutRewardToken(uint i, address oldToken, address newToken) external;

    function balanceOf(address account) external view returns (uint);
}