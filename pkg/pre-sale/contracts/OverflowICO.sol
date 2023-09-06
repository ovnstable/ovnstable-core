// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

import "./LinearVesting.sol";

contract OverflowICO is Ownable, LinearVesting {
    using SafeERC20 for IERC20;

    IERC20 public immutable commitToken; // USD+ token
    IERC20 public immutable salesToken;  // OVN token
    uint256 public immutable hardCap;
    uint256 public immutable softCap;
    uint256 public immutable totalSales;
    uint256 public immutable startTime;
    uint256 public immutable endTime;
    uint256 public immutable receiveTime;
    uint256 public immutable vestingProportion;
    uint256 public immutable vestingProportionDm;
    uint256 public immutable salesPerCommit;
    uint256 public immutable commitDm;
    uint256 public immutable totalTime;

    uint256 public immutable minCommit;
    uint256 public immutable maxCommit;

    bool public started;
    bool public finished;

    uint256 public timeRatio;
    uint256 public lastUpdate;
    uint256 public totalCommitments;
    uint256 public totalMissedCommit;
    uint256 public totalCommitToBonus;
    mapping(address => uint256) public commitments;
    mapping(address => uint256) public missedCommit;
    mapping(address => uint256) public finalSales;
    mapping(address => uint256) public finalCommit;

    mapping(address => bool) public whitelist;

    event Commit(address indexed buyer, uint256 amount);
    event Claim(address indexed buyer, uint256 refund, uint256 sales, uint256 commit);
    event Claim2(address indexed buyer, uint256 sales, uint256 commit);

    modifier onlyWhitelist() {
        require(whitelist[msg.sender], "!whitelist");
        _;
    }

    struct SetUpParams {
        address commitToken;
        address salesToken;
        uint256 hardCap;
        uint256 softCap;
        uint256 startTime;
        uint256 endTime;
        uint256 receiveTime;
        uint256 vestingBegin;
        uint256 vestingDuration;
        uint256 vestingProportion;
        uint256 minCommit;
        uint256 maxCommit;
        uint256 totalSales;
    }

    constructor(
        SetUpParams memory params
    ) LinearVesting(params.salesToken, params.vestingBegin, params.vestingDuration) {
        require(params.startTime >= block.timestamp, "Start time must be in the future.");
        require(params.endTime > params.startTime, "End time must be greater than start time.");
        require(params.hardCap > 0, "hardCap should be greater than 0");
        require(params.hardCap > params.softCap, "hardCap should be greater than softCap");
        require(params.minCommit > 0, "Minimum commitment should be greater than 0");
        require(params.maxCommit >= params.minCommit, "Maximum commitment should be greater or equal to minimum commitment");

        commitToken = IERC20(params.commitToken);
        salesToken = IERC20(params.salesToken);
        hardCap = params.hardCap;
        softCap = params.softCap;
        startTime = params.startTime;
        endTime = params.endTime;
        receiveTime = params.receiveTime;
        minCommit = params.minCommit;
        maxCommit = params.maxCommit;
        totalSales = params.totalSales;
        vestingProportion = params.vestingProportion;
        commitDm = 10 ** IERC20Metadata(params.commitToken).decimals();
        vestingProportionDm = 1e18;
        totalTime = 1e18;
        salesPerCommit = params.totalSales * 1e6 / params.hardCap;
        consolelog("salesPerCommit", params.totalSales * 1e6 / params.hardCap);
    }

    function start() external onlyOwner {
        require(!started, "Already started.");
        started = true;
        salesToken.safeTransferFrom(msg.sender, address(this), totalSales);
    }

    function commit(uint256 amount) external payable nonReentrant onlyWhitelist {
        consolelog("---commit---");
        _updateTime();

        commitToken.safeTransferFrom(msg.sender, address(this), amount);

        require(
            started && block.timestamp >= startTime && block.timestamp < endTime,
            "Can only deposit USD+ during the sale period."
        );
        require(
            minCommit <= commitments[msg.sender] + amount && commitments[msg.sender] + amount <= maxCommit,
            "Commitment amount is outside the allowed range."
        );
        commitments[msg.sender] += amount;
        totalCommitments += amount;
        missedCommit[msg.sender] += _calculateCommit(amount);
        totalMissedCommit += _calculateCommit(amount);
        consolelog("amount", amount);
        consolelog("usd+ balanceOf", commitToken.balanceOf(address(this)));
        consolelog("commitments[msg.sender]", commitments[msg.sender]);
        consolelog("totalCommitments", totalCommitments);
        consolelog("_calculateCommit(amount)", _calculateCommit(amount));
        consolelog("missedCommit[msg.sender]", missedCommit[msg.sender]);
        consolelog("---commit end---\n");
        emit Commit(msg.sender, amount);
    }

    function simulateClaim(address user) external returns (uint256, uint256, uint256) {
        _updateTime();
        if (finalCommit[user] > 0) {
            return (0, finalCommit[user], finalSales[user]);
        }

        if (commitments[user] == 0) return (0, 0, 0);

        if (totalCommitments >= softCap) {
            uint256 commitToSpend = Math.min(commitments[user], (commitments[user] * hardCap) / totalCommitments);
            uint256 commitToRefund = commitments[user] - commitToSpend;
            uint256 userShare = _calculateCommit(commitments[user]) - missedCommit[user];
            uint256 totalShare = _calculateCommit(totalCommitments) - totalMissedCommit;
            uint256 commitToBonus = commitToken.balanceOf(address(this)) - totalCommitments;
            uint256 commitToReceive = userShare * commitToBonus / totalShare;
            uint256 salesToReceive = (commitToSpend * salesPerCommit) / commitDm;
            return (commitToRefund, salesToReceive, commitToReceive);
        } else {
            return (commitments[user], 0, 0);
        }
    }

    function claim() external nonReentrant returns (uint256, uint256, uint256) {
        consolelog("---claim---");
        _updateTime();
        require(block.timestamp > endTime, "Can only claim tokens after the sale has ended.");
        require(commitments[msg.sender] > 0, "You have not deposited any USD+.");

        if (!finished) {
            finish();
        }

        if (totalCommitments >= softCap) {
            consolelog("totalCommitments >= softCap");
            uint256 commitToSpend = Math.min(commitments[msg.sender], (commitments[msg.sender] * hardCap) / totalCommitments);
            uint256 commitToRefund = commitments[msg.sender] - commitToSpend;
            consolelog("commitToSpend", commitToSpend);
            consolelog("commitToRefund", commitToRefund);

            consolelog("partiCommWoMissed", _calculateCommit(commitments[msg.sender]) - missedCommit[msg.sender]);
            consolelog("totalCommitToBonus", totalCommitToBonus);
            consolelog("totalSales", totalSales);

            uint256 userShare = _calculateCommit(commitments[msg.sender]) - missedCommit[msg.sender];
            uint256 totalShare = _calculateCommit(totalCommitments) - totalMissedCommit;
            uint256 commitToReceive = userShare * totalCommitToBonus / totalShare;
            uint256 salesToReceive = (commitToSpend * salesPerCommit) / commitDm;

            consolelog("commitToReceive", commitToReceive);
            consolelog("salesToReceive", salesToReceive);

            commitments[msg.sender] = 0;

            finalSales[msg.sender] = salesToReceive;
            finalCommit[msg.sender] = commitToReceive;

            commitToken.safeTransfer(msg.sender, commitToRefund);

            emit Claim(msg.sender, commitToRefund, salesToReceive, commitToReceive);
            consolelog("---claim end---\n");
            return (commitToRefund, salesToReceive, commitToReceive);
        } else {
            consolelog("totalCommitments < softCap");
            uint256 amt = commitments[msg.sender];
            commitments[msg.sender] = 0;
            commitToken.safeTransfer(msg.sender, amt);
            consolelog("usd+ refund", amt);
            emit Claim(msg.sender, amt, 0, 0);
            consolelog("---claim end---\n");
            return (amt, 0, 0);
        }
    }

    function claim2() external nonReentrant {
        consolelog("---claim2---");
        require(block.timestamp >= receiveTime, "not claimable yet");
        uint256 a1 = finalSales[msg.sender];
        uint256 a2 = finalCommit[msg.sender];
        consolelog("a1", a1);
        consolelog("a2", a2);
        require(a1 != 0 || a2 != 0, "not zero final values");
        finalCommit[msg.sender] = 0;
        finalSales[msg.sender] = 0;

        uint256 vesting = a1 * vestingProportion / vestingProportionDm;
        consolelog("vesting", vesting);
        _grantVestedReward(msg.sender, vesting);

        consolelog("send OVN to participant", a1 - vesting);
        salesToken.safeTransfer(msg.sender, a1 - vesting);

        consolelog("send USD+ to participant", a2);
        commitToken.safeTransfer(msg.sender, a2);
        consolelog("---claim2 end---\n");
        emit Claim2(msg.sender, a1, a2);
    }

    function finish() public onlyOwner {
         _updateTime();
        consolelog("---finish---");
        require(block.timestamp > endTime, "Can only finish after the sale has ended.");
        require(!finished, "Already finished.");
        finished = true;

        if (totalCommitments >= softCap) {
            consolelog("totalCommitments >= softCap");
            consolelog("usd+ .balanceOf", commitToken.balanceOf(address(this)));
            consolelog("totalCommitments", totalCommitments);
            consolelog("hardCap", hardCap);
            uint256 usingCommitToken = Math.min(hardCap, totalCommitments);
            consolelog("send usd+ to owner", usingCommitToken);
            commitToken.safeTransfer(owner(), usingCommitToken);
            consolelog("send ovn to owner", totalSales - (usingCommitToken * salesPerCommit) / commitDm);
            salesToken.safeTransfer(owner(), totalSales - (usingCommitToken * salesPerCommit) / commitDm);
        } else {
            consolelog("totalCommitments < softCap");
            consolelog("usd+ .balanceOf", commitToken.balanceOf(address(this)));
            consolelog("totalCommitments", totalCommitments);
            consolelog("send usd+ to owner", commitToken.balanceOf(address(this)) - totalCommitments);
            commitToken.safeTransfer(owner(), commitToken.balanceOf(address(this)) - totalCommitments);
            salesToken.safeTransfer(owner(), totalSales);
        }

        totalCommitToBonus = commitToken.balanceOf(address(this));
        if (totalCommitments >= hardCap) {
            totalCommitToBonus -= (totalCommitments - hardCap);
        }

        consolelog("totalCommitToBonus", totalCommitToBonus);
        consolelog("---finish end---\n");
    }

    function donate() external payable {
        // Anyone can donate a few gwei to fix integer division accuracy issues.
        // Typically, the deployer will call this.
    }

    function addToWhitelist(address[] calldata toAddAddresses) external onlyOwner {
        for (uint i = 0; i < toAddAddresses.length; i++) {
            whitelist[toAddAddresses[i]] = true;
        }
    }

    function removeFromWhitelist(address[] calldata toRemoveAddresses) external onlyOwner {
        for (uint i = 0; i < toRemoveAddresses.length; i++) {
            delete whitelist[toRemoveAddresses[i]];
        }
    }

    function _calculateCommit(uint256 value) internal view returns (uint256) {
        return value * timeRatio;
    }

    function _updateTime() internal {
        consolelog("---_updateTime---");
       
        require(block.timestamp >= startTime, "not started");
        if (totalCommitments > 0) {
            uint256 elapsed = Math.min(block.timestamp, endTime) - Math.max(Math.min(lastUpdate, endTime), startTime);
            consolelog("elapsed", elapsed);
            consolelog("duration", endTime - startTime);
            consolelog("totalSales", totalSales);
            uint256 share = totalTime * elapsed / (endTime - startTime);
            timeRatio += share / totalCommitments;
            consolelog("timeRatio", timeRatio);
        }
        lastUpdate = block.timestamp;
        consolelog("---_updateTime end---\n");
    }

    // will be deleted later
    function logCommonInfo() public {
        consolelog("---logCommonInfo---");
        consolelog("|usdpBalance(contract)", commitToken.balanceOf(address(this)));
        consolelog("|ovnBalance(contract) ", salesToken.balanceOf(address(this)));
        consolelog("|usdpBalance(owner)   ", commitToken.balanceOf(address(owner())));
        consolelog("|ovnBalance(owner)    ", salesToken.balanceOf(address(owner())));
        consolelog("---logCommonInfo---");
    }

}
