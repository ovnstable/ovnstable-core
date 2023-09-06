// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

import "./LinearVesting.sol";

contract OverflowICO is Ownable, LinearVesting {
    using SafeERC20 for IERC20;

    IERC20 public immutable salesToken;    // USD+ token
    IERC20 public immutable emissionToken; // OVN token
    uint256 public immutable usdpToRaise;
    uint256 public immutable refundThreshold;
    uint256 public immutable totalEmission;
    uint256 public immutable startTime;
    uint256 public immutable endTime;
    uint256 public immutable receiveTime;
    uint256 public immutable vestingProportion;
    uint256 public immutable emissionPerUsdPlus;

    uint256 public immutable minCommit;
    uint256 public immutable maxCommit;

    uint256 public immutable salesDm;
    uint256 public immutable emissionDm;
    uint256 public immutable ratioDm;

    bool public started;
    bool public finished;

    uint256 public timeMovingRatio;
    uint256 public lastUpdate;
    uint256 public totalCommitments;
    uint256 public totalMissed;
    uint256 public totalSalesAmountToBonus;
    mapping(address => uint256) public commitments;
    mapping(address => uint256) public missedSales;
    mapping(address => uint256) public finalEmissions;
    mapping(address => uint256) public finalSales;

    mapping(address => bool) public whitelist;

    event Commit(address indexed buyer, uint256 amount);
    event Claim(address indexed buyer, uint256 sales, uint256 token, uint256 emission);
    event Claim2(address indexed buyer, uint256 token, uint256 emission);

    modifier onlyWhitelist() {
        require(whitelist[msg.sender], "!whitelist");
        _;
    }

    struct SetUpParams {
        address salesToken;
        address emissionToken;
        uint256 usdpToRaise;
        uint256 refundThreshold;
        uint256 startTime;
        uint256 endTime;
        uint256 receiveTime;
        uint256 vestingBegin;
        uint256 vestingDuration;
        uint256 vestingProportion;
        uint256 minCommit;
        uint256 maxCommit;
        uint256 totalEmission;
    }

    constructor(
        SetUpParams memory params
    ) LinearVesting(params.emissionToken, params.vestingBegin, params.vestingDuration) {
        require(params.startTime >= block.timestamp, "Start time must be in the future.");
        require(params.endTime > params.startTime, "End time must be greater than start time.");
        require(params.usdpToRaise > 0, "USD+ to raise should be greater than 0");
        require(params.usdpToRaise > params.refundThreshold, "USD+ to raise should be greater than refund threshold");
        require(params.minCommit > 0, "Minimum commitment should be greater than 0");
        require(params.maxCommit >= params.minCommit, "Maximum commitment should be greater or equal to minimum commitment");

        salesToken = IERC20(params.salesToken);
        emissionToken = IERC20(params.emissionToken);
        usdpToRaise = params.usdpToRaise;
        refundThreshold = params.refundThreshold;
        startTime = params.startTime;
        endTime = params.endTime;
        receiveTime = params.receiveTime;
        minCommit = params.minCommit;
        maxCommit = params.maxCommit;
        totalEmission = params.totalEmission;
        vestingProportion = params.vestingProportion;
        salesDm = 10 ** IERC20Metadata(params.salesToken).decimals();
        emissionDm = 10 ** IERC20Metadata(params.emissionToken).decimals();
        ratioDm = 10 ** IERC20Metadata(params.emissionToken).decimals() / 10 ** IERC20Metadata(params.salesToken).decimals();

        emissionPerUsdPlus = params.totalEmission * 1e6 / params.usdpToRaise;
        consolelog("emissionPerUsdPlus", params.totalEmission * 1e6 / params.usdpToRaise);
    }

    function start() external onlyOwner {
        require(!started, "Already started.");
        started = true;
        emissionToken.safeTransferFrom(msg.sender, address(this), totalEmission);
    }

    function commit(uint256 amount) external payable nonReentrant onlyWhitelist {
        consolelog("---commit---");
        _updateEmission();

        salesToken.safeTransferFrom(msg.sender, address(this), amount);

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
        missedSales[msg.sender] += _calculateEmission(amount);
        totalMissed += _calculateEmission(amount);
        consolelog("amount", amount);
        consolelog("usd+ balanceOf", salesToken.balanceOf(address(this)));
        consolelog("commitments[msg.sender]", commitments[msg.sender]);
        consolelog("totalCommitments", totalCommitments);
        consolelog("_calculateEmission(amount)", _calculateEmission(amount));
        consolelog("missedSales[msg.sender]", missedSales[msg.sender]);
        consolelog("---commit end---\n");
        emit Commit(msg.sender, amount);
    }

    function simulateClaim(address user) external returns (uint256, uint256, uint256) {
        _updateEmission();
        if (finalSales[user] > 0) {
            return (0, finalSales[user], finalEmissions[user]);
        }

        if (commitments[user] == 0) return (0, 0, 0);

        if (totalCommitments >= refundThreshold) {
            uint256 salesToSpend = Math.min(commitments[user], (commitments[user] * usdpToRaise) / totalCommitments);
            uint256 salesToRefund = commitments[user] - salesToSpend;
            uint256 userShare = _calculateEmission(commitments[user]) - missedSales[user];
            uint256 totalShare = _calculateEmission(totalCommitments) - totalMissed;
            uint256 salesToBonus = salesToken.balanceOf(address(this)) - totalCommitments;
            uint256 salesToReceive = userShare * salesToBonus / totalShare;
            uint256 emissionToReceive = (salesToSpend * emissionPerUsdPlus) / salesDm;
            return (salesToRefund, salesToReceive, emissionToReceive);
        } else {
            return (commitments[user], 0, 0);
        }
    }

    function claim() external nonReentrant returns (uint256, uint256, uint256) {
        consolelog("---claim---");
        _updateEmission();
        require(block.timestamp > endTime, "Can only claim tokens after the sale has ended.");
        require(commitments[msg.sender] > 0, "You have not deposited any USD+.");

        if (!finished) {
            finish();
        }

        if (totalCommitments >= refundThreshold) {
            consolelog("totalCommitments >= refundThreshold");
            uint256 salesToSpend = Math.min(commitments[msg.sender], (commitments[msg.sender] * usdpToRaise) / totalCommitments);
            uint256 salesToRefund = commitments[msg.sender] - salesToSpend;
            consolelog("salesToSpend", salesToSpend);
            consolelog("salesToRefund", salesToRefund);

            consolelog("partiCommWoMissed", _calculateEmission(commitments[msg.sender]) - missedSales[msg.sender]);
            consolelog("totalSalesAmountToBonus", totalSalesAmountToBonus);
            consolelog("totalEmission", totalEmission);

            uint256 userShare = _calculateEmission(commitments[msg.sender]) - missedSales[msg.sender];
            uint256 totalShare = _calculateEmission(totalCommitments) - totalMissed;
            uint256 salesToReceive = userShare * totalSalesAmountToBonus / totalShare;
            uint256 emissionToReceive = (salesToSpend * emissionPerUsdPlus) / salesDm;

            consolelog("salesToReceive", salesToReceive);
            consolelog("emissionToReceive", emissionToReceive);

            commitments[msg.sender] = 0;

            finalEmissions[msg.sender] = emissionToReceive;
            finalSales[msg.sender] = salesToReceive;

            salesToken.safeTransfer(msg.sender, salesToRefund);
            
            emit Claim(msg.sender, salesToRefund, salesToReceive, emissionToReceive);
            consolelog("---claim end---\n");
            return (salesToRefund, salesToReceive, emissionToReceive);
        } else {
            consolelog("totalCommitments < refundThreshold");
            uint256 amt = commitments[msg.sender];
            commitments[msg.sender] = 0;
            salesToken.safeTransfer(msg.sender, amt);
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
        uint256 a2 = finalEmissions[msg.sender];
        consolelog("a1", a1);
        consolelog("a2", a2);
        require(a1 != 0 || a2 != 0, "not zero final values");
        finalSales[msg.sender] = 0;
        finalEmissions[msg.sender] = 0;

        uint256 vesting = a2 * vestingProportion / emissionDm;
        consolelog("vesting", vesting);
        _grantVestedReward(msg.sender, vesting);

        consolelog("send OVN to participant", a2 - vesting);
        emissionToken.safeTransfer(msg.sender, a2 - vesting);

        consolelog("send USD+ to participant", a1);
        salesToken.safeTransfer(msg.sender, a1);
        consolelog("---claim2 end---\n");
        emit Claim2(msg.sender, a1, a2);
    }

    function finish() public onlyOwner {
         _updateEmission();
        consolelog("---finish---");
        require(block.timestamp > endTime, "Can only finish after the sale has ended.");
        require(!finished, "Already finished.");
        finished = true;

        if (totalCommitments >= refundThreshold) {
            consolelog("totalCommitments >= refundThreshold");
            consolelog("usd+ .balanceOf", salesToken.balanceOf(address(this)));
            consolelog("totalCommitments", totalCommitments);
            consolelog("usdpToRaise", usdpToRaise);
            uint256 usingSalesToken = Math.min(usdpToRaise, totalCommitments);
            consolelog("send usd+ to owner", usingSalesToken);
            salesToken.safeTransfer(owner(), usingSalesToken);
            consolelog("send ovn to owner", totalEmission - (usingSalesToken * emissionPerUsdPlus) / salesDm);
            emissionToken.safeTransfer(owner(), totalEmission - (usingSalesToken * emissionPerUsdPlus) / salesDm);
        } else {
            consolelog("totalCommitments < refundThreshold");
            consolelog("usd+ .balanceOf", salesToken.balanceOf(address(this)));
            consolelog("totalCommitments", totalCommitments);
            consolelog("send usd+ to owner", salesToken.balanceOf(address(this)) - totalCommitments);
            salesToken.safeTransfer(owner(), salesToken.balanceOf(address(this)) - totalCommitments);
            emissionToken.safeTransfer(owner(), totalEmission);
        }

        totalSalesAmountToBonus = salesToken.balanceOf(address(this));
        if (totalCommitments >= usdpToRaise) {
            totalSalesAmountToBonus -= (totalCommitments - usdpToRaise);
        }

        consolelog("totalSalesAmountToBonus", totalSalesAmountToBonus);
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

    function _calculateEmission(uint256 value) internal view returns (uint256) {
        return (value * timeMovingRatio) / salesDm;
    }

    function _updateEmission() internal {
        consolelog("---_updateEmission---");
        require(block.timestamp >= startTime, "not started");
        if (totalCommitments > 0) {
            uint256 elapsed = Math.min(block.timestamp, endTime) - Math.max(Math.min(lastUpdate, endTime), startTime);
            consolelog("elapsed", elapsed);
            consolelog("duration", endTime - startTime);
            consolelog("totalEmission", totalEmission);
            uint256 emission = (totalEmission * elapsed) / (endTime - startTime);
            consolelog("emission", emission);
            timeMovingRatio += (emission * salesDm) / (totalCommitments);
            consolelog("timeMovingRatio", timeMovingRatio);
        }
        lastUpdate = block.timestamp;
        consolelog("---_updateEmission end---\n");
    }

    // will be deleted later
    function logCommonInfo() public {
        consolelog("---logCommonInfo---");
        consolelog("|usdpBalance(contract)", salesToken.balanceOf(address(this)));
        consolelog("|ovnBalance(contract) ", emissionToken.balanceOf(address(this)));
        consolelog("|usdpBalance(owner)   ", salesToken.balanceOf(address(owner())));
        consolelog("|ovnBalance(owner)    ", emissionToken.balanceOf(address(owner())));
        consolelog("---logCommonInfo---");
    }

}
