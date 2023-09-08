// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";
import "./IWhitelist.sol";

contract OverflowICO is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum UserPresaleState {
        WAITING_FOR_PRESALE_START,
        COMMIT,
        CLAIM_REFUND,
        WAITING_FOR_CLAIM_BONUS,
        CLAIM_BONUS,
        WAITING_FOR_CLAIM_SALES_FIRST_PART,
        CLAIM_SALES_FIRST_PART,
        WAITING_FOR_CLAIM_VESTING,
        CLAIM_VESTING,
        NOTHING_TO_DO
    }

    struct SetUpParams {
        address commitToken;
        address salesToken;
        uint256 hardCap;
        uint256 softCap;
        uint256 startTime;
        uint256 endTime;
        uint256 claimBonusTime;
        uint256 claimSalesFirstPartTime;
        uint256 vestingBeginTime;
        uint256 vestingDuration;
        uint256 vestingProportion;
        uint256 minCommit;
        uint256 maxCommit;
        uint256 totalSales;
        address whitelist;
    }

    struct UserInfo {
        uint256 userCommitments;
        uint256 salesToReceive;
        uint256 commitToReceive;
        uint256 commitToRefund;
        uint256 lockedSales;
        uint256 unlockedSales;
    }

    IERC20 public immutable commitToken; // USD+ token
    IERC20 public immutable salesToken;  // OVN token
    uint256 public immutable hardCap;
    uint256 public immutable softCap;
    uint256 public immutable totalSales;
    uint256 public immutable vestingProportion;
    uint256 public immutable vestingProportionDm;
    uint256 public immutable salesPerCommit;
    uint256 public immutable commitDm;
    uint256 public immutable totalTime;

    uint256 public immutable startTime;
    uint256 public immutable endTime;
    uint256 public immutable claimBonusTime;
    uint256 public immutable claimSalesFirstPartTime;
    uint256 public immutable vestingBeginTime;
    uint256 public immutable vestingDuration;

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
    mapping(address => uint256) public immutableCommitments;
    mapping(address => uint256) public missedCommit;
    mapping(address => uint256) public finalSales;
    mapping(address => uint256) public finalCommit;


    mapping(address => uint256) public claimableTotal;
    mapping(address => uint256) public claimed;
    mapping(address => bool) public registered;

    IWhitelist public whitelist;

    // will be deleted later
    bool public constant consoleEnabled = false;

    event Commit(address indexed buyer, uint256 amount);
    event ClaimRefund(address indexed buyer, uint256 refund, uint256 sales, uint256 commit);
    event ClaimBonus(address indexed buyer, uint256 commit);
    event ClaimSalesFirstPart(address indexed buyer, uint256 sales);
    event ClaimVesting(address addr, uint256 amount);


    constructor(SetUpParams memory params) {
        require(params.startTime >= block.timestamp, "Start time must be in the future");
        require(params.endTime > params.startTime, "End time must be greater than start time");
        require(params.hardCap > 0, "hardCap should be greater than 0");
        require(params.hardCap > params.softCap, "hardCap should be greater than softCap");
        require(params.minCommit > 0, "Minimum commitment should be greater than 0");
        require(params.maxCommit >= params.minCommit, "Maximum commitment should be greater or equal to minimum commitment");
        require(params.claimBonusTime > params.endTime, "claimBonusTime must be greater than endTime");
        require(params.claimSalesFirstPartTime > params.claimBonusTime, "claimSalesFirstPartTime must be greater than claimBonusTime");
        require(params.vestingBeginTime > params.claimSalesFirstPartTime, "vestingBeginTime must be greater than claimSalesFirstPartTime");

        commitToken = IERC20(params.commitToken);
        salesToken = IERC20(params.salesToken);
        hardCap = params.hardCap;
        softCap = params.softCap;
        startTime = params.startTime;
        endTime = params.endTime;
        claimBonusTime = params.claimBonusTime;
        claimSalesFirstPartTime = params.claimSalesFirstPartTime;
        vestingBeginTime = params.vestingBeginTime;
        vestingDuration = params.vestingDuration;
        minCommit = params.minCommit;
        maxCommit = params.maxCommit;
        totalSales = params.totalSales;
        vestingProportion = params.vestingProportion;
        commitDm = 10 ** IERC20Metadata(params.commitToken).decimals();
        vestingProportionDm = 1e18;
        totalTime = 1e18;
        salesPerCommit = params.totalSales * 1e6 / params.hardCap;
        consolelog("salesPerCommit", params.totalSales * 1e6 / params.hardCap);

        whitelist = IWhitelist(params.whitelist);
    }

    function start() external onlyOwner {
        require(!started, "Already started");
        started = true;
        salesToken.safeTransferFrom(msg.sender, address(this), totalSales);
    }

    function commit(uint256 amount, uint256 tokenId, IWhitelist.TypeNft typeNft) external payable nonReentrant {
        consolelog("---commit---");
        whitelist.verify(msg.sender, tokenId, typeNft);

        require(
            started && block.timestamp >= startTime && block.timestamp < endTime,
            "Can only deposit USD+ during the sale period"
        );
        require(
            minCommit <= commitments[msg.sender] + amount && commitments[msg.sender] + amount <= maxCommit,
            "Commitment amount is outside the allowed range"
        );

        require(getUserState(msg.sender) == UserPresaleState.COMMIT, "Inappropriate user's state");

        _updateTime();

        commitToken.safeTransferFrom(msg.sender, address(this), amount);

        commitments[msg.sender] += amount;
        immutableCommitments[msg.sender] += amount;
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

    function claimRefund() external nonReentrant returns (uint256, uint256, uint256) {
        consolelog("---claimRefund---");

        require(block.timestamp > endTime, "Can only claim tokens after the sale has ended");
        require(commitments[msg.sender] > 0, "You have not deposited any USD+");
        require(getUserState(msg.sender) == UserPresaleState.CLAIM_REFUND, "Inappropriate user's state");

        _updateTime();

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

            emit ClaimRefund(msg.sender, commitToRefund, salesToReceive, commitToReceive);
            consolelog("---claimRefundCommit end---\n");
            return (commitToRefund, salesToReceive, commitToReceive);
        } else {
            consolelog("totalCommitments < softCap");
            uint256 userCommitments = commitments[msg.sender];
            commitments[msg.sender] = 0;
            commitToken.safeTransfer(msg.sender, userCommitments);
            consolelog("usd+ refund", userCommitments);
            emit ClaimRefund(msg.sender, userCommitments, 0, 0);
            consolelog("---claim end---\n");
            return (userCommitments, 0, 0);
        }
    }

    function claimBonus() external nonReentrant {
        consolelog("---claimBonus---");
        require(block.timestamp >= claimBonusTime, "not bonus yet");
        require(getUserState(msg.sender) == UserPresaleState.CLAIM_BONUS, "Inappropriate user's state");

        uint256 userCommit = finalCommit[msg.sender];
        consolelog("userCommit", userCommit);
        require(userCommit != 0, "not zero final values");
        finalCommit[msg.sender] = 0;

        consolelog("send USD+ to participant", userCommit);
        commitToken.safeTransfer(msg.sender, userCommit);
        consolelog("---claimBonus end---\n");
        emit ClaimBonus(msg.sender, userCommit);
    }

    function claimSalesFirstPart() external nonReentrant {
        consolelog("---claimSalesFirstPart---");
        require(block.timestamp >= claimSalesFirstPartTime, "not claimSalesFirstPart yet");
        require(getUserState(msg.sender) == UserPresaleState.CLAIM_SALES_FIRST_PART, "Inappropriate user's state");

        uint256 userSales = finalSales[msg.sender];
        consolelog("userSales", userSales);
        require(userSales != 0, "not zero final values");
        finalSales[msg.sender] = 0;

        uint256 vesting = userSales * vestingProportion / vestingProportionDm;
        consolelog("vesting", vesting);
        _grantVestedReward(msg.sender, vesting);

        consolelog("send OVN to participant", userSales - vesting);
        salesToken.safeTransfer(msg.sender, userSales - vesting);

        consolelog("---claimSalesFirstPart end---\n");
        emit ClaimSalesFirstPart(msg.sender, userSales);
    }

    function claimVesting(address addr) public nonReentrant returns (uint256) {
        consolelog("---claimVesting---");
        require(registered[addr]);
        require(block.timestamp >= vestingBeginTime, "not claimVesting yet");
        require(getUserState(addr) == UserPresaleState.CLAIM_VESTING, "Inappropriate user's state");

        uint256 vested = 0;
        if (block.timestamp < vestingBeginTime) {
            vested = 0;
        } else if (block.timestamp >= vestingBeginTime + vestingDuration) {
            consolelog("block.timestamp >= vestBeginning + vestDuration");
            vested = claimableTotal[addr];
        } else {
            consolelog("block.timestamp >= vestBeginning && block.timestamp < vestBeginning + vestDuration");
            vested = Math.mulDiv(claimableTotal[addr], block.timestamp - vestingBeginTime, vestingDuration);
        }

        consolelog("vested", vested);

        uint256 delta = vested - claimed[addr];
        claimed[addr] = vested;

        salesToken.safeTransfer(addr, delta);
        emit ClaimVesting(addr, delta);
        consolelog("---claimVesting end---\n");
        return delta;
    }

    function finish() public onlyOwner {
        consolelog("---finish---");
        require(block.timestamp > endTime, "Can only finish after the sale has ended");
        require(!finished, "Already finished");

        _updateTime();

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

    function _calculateCommit(uint256 value) internal view returns (uint256) {
        return value * timeRatio / 1e18;
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
            consolelog("share", share);
            timeRatio += share * 1e18 / totalCommitments;
            consolelog("timeRatio", timeRatio);
        }
        lastUpdate = block.timestamp;
        consolelog("---_updateTime end---\n");
    }

    function _updateTimeStatic() internal view returns (uint256) {
        if (totalCommitments > 0) {
            uint256 elapsed = Math.min(block.timestamp, endTime) - Math.max(Math.min(lastUpdate, endTime), startTime);
            uint256 share = totalTime * elapsed / (endTime - startTime);
            return timeRatio + share / totalCommitments;
        } else {
            return 0;
        }
    }

    function _grantVestedReward(address addr, uint256 amount) internal {
        require(!registered[addr], "already registered");
        claimableTotal[addr] = amount;
        registered[addr] = true;
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

    // will be deleted later
    function consolelog(string memory text, uint256 value) public {
        if (consoleEnabled) {
            console.log(text, value);
        }
    }

    // will be deleted later
    function consolelog(string memory text) public {
        if (consoleEnabled) {
            console.log(text);
        }
    }

    function getUserState(address user) public view returns (UserPresaleState) {
        if (!started || block.timestamp < startTime) {
            return UserPresaleState.WAITING_FOR_PRESALE_START;
        }

        if (block.timestamp >= startTime && block.timestamp < endTime) {
            return UserPresaleState.COMMIT;
        }

        if (block.timestamp >= endTime && commitments[user] > 0) {
            return UserPresaleState.CLAIM_REFUND;
        }

        if (block.timestamp >= endTime && block.timestamp < claimBonusTime && commitments[user] == 0 && finalSales[user] != 0) {
            return UserPresaleState.WAITING_FOR_CLAIM_BONUS;
        }

        if (block.timestamp >= claimBonusTime && finalCommit[user] != 0) {
            return UserPresaleState.CLAIM_BONUS;
        }

        if (block.timestamp >= claimBonusTime && block.timestamp < claimSalesFirstPartTime && finalCommit[user] == 0 && finalSales[user] != 0) {
            return UserPresaleState.WAITING_FOR_CLAIM_SALES_FIRST_PART;
        }

        if (block.timestamp >= claimSalesFirstPartTime && finalSales[user] != 0) {
            return UserPresaleState.CLAIM_SALES_FIRST_PART;
        }

        if (block.timestamp >= claimSalesFirstPartTime && block.timestamp < vestingBeginTime && registered[user]) {
            return UserPresaleState.WAITING_FOR_CLAIM_VESTING;
        }

        if (block.timestamp > vestingBeginTime && registered[user] && claimableTotal[user] != claimed[user]) {
            return UserPresaleState.CLAIM_VESTING;
        }

        return UserPresaleState.NOTHING_TO_DO;
    }

    function getUserInfo(address user) external view returns (UserInfo memory userInfo) {

        uint256 timeRatioStatic = _updateTimeStatic();

        UserPresaleState userState = getUserState(user);

        if (userState == UserPresaleState.WAITING_FOR_PRESALE_START) {
            return UserInfo(0, 0, 0, 0, 0, 0);
        }

        if (userState == UserPresaleState.COMMIT || userState == UserPresaleState.CLAIM_REFUND) {
            if (commitments[user] == 0) {
                return UserInfo(0, 0, 0, 0, 0, 0);
            } else {
                uint256 commitToSpend = Math.min(commitments[user], (commitments[user] * hardCap) / totalCommitments);
                uint256 commitToRefund = commitments[user] - commitToSpend;
                uint256 userShare = commitments[user] * timeRatioStatic - missedCommit[user];
                uint256 totalShare = totalCommitments * timeRatioStatic - totalMissedCommit;
                uint256 commitToBonus = commitToken.balanceOf(address(this)) - totalCommitments;
                uint256 commitToReceive = userShare * commitToBonus / totalShare;
                uint256 salesToReceive = (commitToSpend * salesPerCommit) / commitDm;

                return UserInfo(
                    commitments[user],
                    salesToReceive,
                    commitToReceive,
                    commitToRefund,
                    salesToReceive,
                    0
                );
            }
        }

        if (userState == UserPresaleState.WAITING_FOR_CLAIM_BONUS || userState == UserPresaleState.CLAIM_BONUS) {
            return UserInfo(
                immutableCommitments[user],
                finalSales[user],
                finalCommit[user],
                0,
                finalSales[user],
                0
            );
        }

        if (userState == UserPresaleState.WAITING_FOR_CLAIM_SALES_FIRST_PART) {
            return UserInfo(
                immutableCommitments[user],
                finalSales[user],
                0,
                0,
                finalSales[user],
                0
            );
        }

        if (userState == UserPresaleState.CLAIM_SALES_FIRST_PART) {
            uint256 vesting = finalSales[user] * vestingProportion / vestingProportionDm;
            return UserInfo(
                immutableCommitments[user],
                finalSales[user],
                0,
                0,
                vesting,
                finalSales[user] - vesting
            );
        }

        if (userState == UserPresaleState.WAITING_FOR_CLAIM_VESTING) {
            return UserInfo(
                immutableCommitments[user],
                claimableTotal[user],
                0,
                0,
                claimableTotal[user],
                0
            );
        }

        if (userState == UserPresaleState.CLAIM_VESTING) {
            uint256 vested;
            if (block.timestamp < vestingBeginTime) {
                vested = 0;
            } else if (block.timestamp >= vestingBeginTime + vestingDuration) {
                vested = claimableTotal[user];
            } else {
                vested = Math.mulDiv(claimableTotal[user], block.timestamp - vestingBeginTime, vestingDuration);
            }
            uint256 delta = vested - claimed[user];
            return UserInfo(
                immutableCommitments[user],
                claimableTotal[user] - claimed[user],
                0,
                0,
                claimableTotal[user] - claimed[user] - delta,
                delta
            );
        }

        if (userState == UserPresaleState.NOTHING_TO_DO) {
            return UserInfo(immutableCommitments[user], 0, 0, 0, 0, 0);
        }

    }

}
