// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/compatibility/GovernorCompatibilityBravo.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
contract OvnGovernor is Governor, GovernorCountingSimple, GovernorVotes, GovernorVotesQuorumFraction {
    constructor(ERC20Votes _token)
    Governor("OvnGovernor")
    GovernorVotes(_token)
    GovernorVotesQuorumFraction(4)
    {}

    function votingDelay() public pure override returns (uint256) {
        return 1; // 1 block
    }

    function votingPeriod() public pure override returns (uint256) {
        return 2; // 1 week
    }

    // The following functions are overrides required by Solidity.

    function quorum(uint256 blockNumber)
    public
    view
    override(IGovernor, GovernorVotesQuorumFraction)
    returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function getVotes(address account, uint256 blockNumber)
    public
    view
    override(IGovernor, GovernorVotes)
    returns (uint256)
    {
        return super.getVotes(account, blockNumber);
    }

    function voteSucceeded(uint256 proposalId) public view returns (bool){
        return super._voteSucceeded(proposalId);
    }

    function quorumReached(uint256 proposalId) public view returns (bool){
        return super._quorumReached(proposalId);
    }

}
