// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract LinearVestingExample is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable rewardToken;
    uint256 public immutable vestBeginning;
    uint256 public immutable vestDuration;

    mapping(address => uint256) public claimableTotal;
    mapping(address => uint256) public claimed;
    mapping(address => bool) public registered;

    event ClaimVesting(address addr, uint256 amount);

    constructor(IERC20 rewardToken_, uint256 vestBeginning_, uint256 vestDuration_) {
        rewardToken = rewardToken_;
        vestBeginning = vestBeginning_;
        vestDuration = vestDuration_;
    }

    function _grantVestedReward(address addr, uint256 amount) internal {
        require(!registered[addr], "already registered");
        claimableTotal[addr] = amount;
        registered[addr] = true;
    }

    function claim3(address addr) public nonReentrant returns (uint256) {
        require(registered[addr]);
        uint256 vested = 0;
        if (block.timestamp < vestBeginning) {
            vested = 0;
        } else if (block.timestamp >= vestBeginning + vestDuration) {
            vested = claimableTotal[addr];
        } else {
            vested = Math.mulDiv(claimableTotal[addr], block.timestamp - vestBeginning, vestDuration);
        }

        uint256 delta = vested - claimed[addr];
        claimed[addr] = vested;

        rewardToken.safeTransfer(addr, delta);
        emit ClaimVesting(addr, delta);
        return delta;
    }
}
