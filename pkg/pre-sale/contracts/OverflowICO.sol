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
        uint256 userCommitments;  // How much total user commit in USD+
        uint256 salesToReceive;   // How much user to get OVN in future (dynamic changed by overflow) (decrease when user claim OVN)
        uint256 commitToReceive;  // How much user to get bonus from USD+ (dynamic from rebase USD+)
        uint256 commitToRefund;   // How much user to get USD+ if total_commit > hard cap
        uint256 lockedSales;      // How much user has locked OVN (decrease when user claim OVN)
        uint256 unlockedSales;    // How much user available for claim OVN (decrease to zero when user claim OVN) (unlock by vesting time)
    }

    IERC20 public immutable commitToken; // USD+ token
    IERC20 public immutable salesToken;  // OVN token
    uint256 public immutable hardCap;
    uint256 public immutable softCap;
    uint256 public immutable totalSales;
    uint256 public immutable vestingProportion;
    uint256 public immutable salesPerCommit;
    uint256 public immutable commitDm;

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

    uint256 public totalCommitments;
    uint256 public totalShare;
    uint256 public totalCommitToBonus;
    mapping(address => uint256) public commitments;
    mapping(address => uint256) public share;
    mapping(address => uint256) public immutableCommitments;
    mapping(address => uint256) public finalSales;
    mapping(address => uint256) public finalCommit;

    mapping(address => uint256) public claimableTotal;
    mapping(address => uint256) public claimed;
    mapping(address => bool) public registered;

    IWhitelist public whitelist;

    uint256 public constant VESTING_PROPOGATION_DM = 1e18;
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
        salesPerCommit = params.totalSales * 10 ** IERC20Metadata(params.commitToken).decimals() / params.hardCap;
        consolelog("salesPerCommit", params.totalSales * 1e6 / params.hardCap);

        whitelist = IWhitelist(params.whitelist);
    }

    /**
     * @dev Run Pre Sale
     * Execute only by Owner
     * Owner should have amount "totalSales" on balance
     */

    function start() external onlyOwner {
        require(!started, "Already started");
        started = true;
        salesToken.safeTransferFrom(msg.sender, address(this), totalSales);
    }

    /**
     * @dev Buy SalesTokens (OVN) for commitTokens (USD+)
     *
     * Execute only by User
     * User should to have Whitelist NFT other transaction revert by error: `!whitelist`
     * @param amount - amount USD+ for buy OVN
     * @param tokenId - Whitelist NFT ID
     * @param typeNft - NFT from Galxe(Service) or OVN Partners (Partner)
     */

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

        commitToken.safeTransferFrom(msg.sender, address(this), amount);

        commitments[msg.sender] += amount;
        share[msg.sender] += amount * (endTime - block.timestamp);
        totalShare += amount * (endTime - block.timestamp);
        immutableCommitments[msg.sender] += amount;
        totalCommitments += amount;
        consolelog("amount", amount);
        consolelog("usd+ balanceOf", commitToken.balanceOf(address(this)));
        consolelog("commitments[msg.sender]", commitments[msg.sender]);
        consolelog("totalCommitments", totalCommitments);
        consolelog("share[msg.sender]", share[msg.sender]);
        consolelog("totalShare", totalShare);
        consolelog("---commit end---\n");
        emit Commit(msg.sender, amount);
    }

   /**
     * @dev Claim extra USD+ if total_commit > hard_cap
     * Executing only after end pre-sale.
     *
     * Transfer extra USD+ to user.
     * Calculating also next params:
     * - finalSales (total OVN user should to get)
     * - finalCommit  (total rebase of USD+ user should to get)
     */

    function claimRefund() external nonReentrant returns (uint256, uint256, uint256) {
        consolelog("---claimRefund---");

        require(block.timestamp > endTime, "Can only claim tokens after the sale has ended");
        require(commitments[msg.sender] > 0, "You have not deposited any USD+");
        require(getUserState(msg.sender) == UserPresaleState.CLAIM_REFUND, "Inappropriate user's state");

        if (!finished) {
            _finish();
        }

        if (totalCommitments >= softCap) {
            consolelog("totalCommitments >= softCap");
            uint256 commitToSpend = Math.min(commitments[msg.sender], (commitments[msg.sender] * hardCap) / totalCommitments);
            uint256 commitToRefund = commitments[msg.sender] - commitToSpend;
            consolelog("commitToSpend", commitToSpend);
            consolelog("commitToRefund", commitToRefund);
            consolelog("totalCommitToBonus", totalCommitToBonus);

            uint256 commitToReceive = share[msg.sender] * totalCommitToBonus / totalShare;
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

    /**
     * @dev Claim bonus (rebase) USD+
     * Executing only after "claimRefund"
     * Transfer bonus USD+ to user.
     */

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


    /**
     * @dev Claim 1 first part of OVN (25% depends from vestingProportion)
     * Executing only after "claimBonus"
     * Transfer OVN to user.
     */


    function claimSalesFirstPart() external nonReentrant {
        consolelog("---claimSalesFirstPart---");
        require(block.timestamp >= claimSalesFirstPartTime, "not claimSalesFirstPart yet");
        require(getUserState(msg.sender) == UserPresaleState.CLAIM_SALES_FIRST_PART, "Inappropriate user's state");

        uint256 userSales = finalSales[msg.sender];
        consolelog("userSales", userSales);
        require(userSales != 0, "not zero final values");
        finalSales[msg.sender] = 0;

        uint256 vesting = userSales * vestingProportion / VESTING_PROPOGATION_DM;
        consolelog("vesting", vesting);
        _grantVestedReward(msg.sender, vesting);

        consolelog("send OVN to participant", userSales - vesting);
        salesToken.safeTransfer(msg.sender, userSales - vesting);

        consolelog("---claimSalesFirstPart end---\n");
        emit ClaimSalesFirstPart(msg.sender, userSales);
    }


    /**
     * @dev Claim unlock OVN tokens by time (vesting)
     * Transfer OVN to user.
     */

    function claimVesting(address addr) public nonReentrant returns (uint256) {
        consolelog("---claimVesting---");
        require(registered[addr]);
        require(block.timestamp >= vestingBeginTime, "not claimVesting yet");
        require(getUserState(addr) == UserPresaleState.CLAIM_VESTING, "Inappropriate user's state");

        uint256 vested = 0;
        if (block.timestamp >= vestingBeginTime + vestingDuration) {
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

    function _finish() private {
        consolelog("---finish---");
        require(block.timestamp > endTime, "Can only finish after the sale has ended");
        require(!finished, "Already finished");

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

        // How much USD+ rebase distribute to users
        totalCommitToBonus = commitToken.balanceOf(address(this));

        // Users should get theirs USD+ to back
        if (totalCommitments >= hardCap) {
            totalCommitToBonus -= (totalCommitments - hardCap);
        }

        consolelog("totalCommitToBonus", totalCommitToBonus);
        consolelog("---finish end---\n");
    }

    function finish() public onlyOwner {
        _finish();
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
    function consolelog(string memory text, uint256 value) public view {
        if (consoleEnabled) {
            console.log(text, value);
        }
    }

    // will be deleted later
    function consolelog(string memory text) public view {
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

        UserPresaleState userState = getUserState(user);
        consolelog("userState", uint256(userState));

        if (userState == UserPresaleState.WAITING_FOR_PRESALE_START) {
            return UserInfo(0, 0, 0, 0, 0, 0);
        }

        if (userState == UserPresaleState.COMMIT || userState == UserPresaleState.CLAIM_REFUND) {
            if (commitments[user] == 0) {
                return UserInfo(0, 0, 0, 0, 0, 0);
            } else {
                if (totalCommitments >= softCap) {
                    uint256 commitToSpend = Math.min(commitments[user], (commitments[user] * hardCap) / totalCommitments);
                    uint256 commitToRefund = commitments[user] - commitToSpend;

                    consolelog("commitToSpend", commitToSpend);
                    consolelog("commitToRefund", commitToRefund);

                    consolelog("commitToken.balanceOf(address(this))", commitToken.balanceOf(address(this)));
                    consolelog("totalCommitments", totalCommitments);

                    uint256 commitToBonus = !finished ? (commitToken.balanceOf(address(this)) - totalCommitments) : totalCommitToBonus;
                    consolelog("commitToBonus", commitToBonus);
                    uint256 commitToReceive = share[user] * commitToBonus / totalShare;
                    consolelog("commitToReceive", commitToReceive);
                    uint256 salesToReceive = (commitToSpend * salesPerCommit) / commitDm;
                    consolelog("salesToReceive", salesToReceive);

                    return UserInfo(
                        commitments[user],
                        salesToReceive,
                        commitToReceive,
                        commitToRefund,
                        salesToReceive,
                        0
                    );
                } else {
                    return UserInfo(commitments[user], 0, 0, commitments[user], 0, 0);
                }
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
            uint256 vesting = finalSales[user] * vestingProportion / VESTING_PROPOGATION_DM;
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
            if (block.timestamp >= vestingBeginTime + vestingDuration) {
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
