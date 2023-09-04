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
    uint256 public immutable ethersToRaise; // сделать usd+ to raise
    uint256 public immutable refundThreshold;
    uint256 public immutable totalEmission;
    uint256 public immutable startTime;
    uint256 public immutable endTime;
    uint256 public immutable receiveTime;
    uint256 public immutable vestingProportion;
    uint256 public immutable emissionPerUsdPlus; // valueOVN = (valueUsdPlus * emissionPerUsdPlus) / 10 ** 18;

    uint256 public immutable minCommit;
    uint256 public immutable maxCommit;

    bool public started;
    bool public finished;

    uint256 emissionPerEther;
    uint256 lastUpdate;
    uint256 public totalCommitments;
    uint256 totalSalesBalanceToReceive;
    uint256 transferedSalesBalanceToReceive;
    mapping(address => uint256) public commitments;
    mapping(address => uint256) public missedSales;
    mapping(address => uint256) public finalEmissions;
    mapping(address => uint256) public finalSales;

    mapping(address => bool) public whitelist;

    event Commit(address indexed buyer, uint256 amount);
    event Claim(address indexed buyer, uint256 eth, uint256 token, uint256 emission);
    event Claim2(address indexed buyer, uint256 token, uint256 emission);


    modifier onlyWhitelist() {
        require(whitelist[msg.sender], "!whitelist");
        _;
    }

    function calculateEmission(uint256 value) internal view returns (uint256) {
        return (value * emissionPerEther) / 10 ** 18;
    }

    function _updateEmission() internal {
        require(block.timestamp >= startTime, "not started");
        if (totalCommitments > 0) {
            uint256 elapsed = Math.min(block.timestamp, endTime) - Math.max(Math.min(lastUpdate, endTime), startTime);
            uint256 emission = (totalEmission * elapsed) / (endTime - startTime);
            emissionPerEther += (emission * 10 ** 18) / totalCommitments;
        }
        lastUpdate = block.timestamp;
    }

    struct SetUpParams {
        IERC20 salesToken;
        uint256 ethersToRaise;
        uint256 refundThreshold;
        uint256 startTime;
        uint256 endTime;
        uint256 receiveTime;
        uint256 vestingBegin;
        uint256 vestingDuration;
        uint256 vestingProportion;
        uint256 minCommit;
        uint256 maxCommit;
        IERC20 emissionToken;
        uint256 totalEmission;
    }

    constructor(
        SetUpParams memory params
    ) LinearVesting(params.emissionToken, params.vestingBegin, params.vestingDuration) {
        require(params.startTime >= block.timestamp, "Start time must be in the future.");
        require(params.endTime > params.startTime, "End time must be greater than start time.");
        require(params.ethersToRaise > 0, "Ethers to raise should be greater than 0");
        require(params.ethersToRaise > params.refundThreshold, "Ethers to raise should be greater than refund threshold");
        require(params.minCommit > 0, "Minimum commitment should be greater than 0");
        require(params.maxCommit >= params.minCommit, "Maximum commitment should be greater or equal to minimum commitment");

        salesToken = params.salesToken;
        ethersToRaise = params.ethersToRaise;
        refundThreshold = params.refundThreshold;
        startTime = params.startTime;
        endTime = params.endTime;
        receiveTime = params.receiveTime;
        minCommit = params.minCommit;
        maxCommit = params.maxCommit;
        emissionToken = params.emissionToken;
        totalEmission = params.totalEmission;
        vestingProportion = params.vestingProportion;
        emissionPerUsdPlus = params.ethersToRaise / params.totalEmission;
    }



    function start() external onlyOwner {
        require(!started, "Already started.");
        started = true;
        emissionToken.safeTransferFrom(msg.sender, address(this), totalEmission);
    }


    function commit(uint256 amount) external payable nonReentrant onlyWhitelist {
        _updateEmission();

        console.log("salesToken.balanceOf before", salesToken.balanceOf(address(this)), msg.sender);
        salesToken.safeTransferFrom(msg.sender, address(this), amount);
        console.log("salesToken.balanceOf after", salesToken.balanceOf(address(this)));

        require(
            started && block.timestamp >= startTime && block.timestamp < endTime,
            "Can only deposit Ether during the sale period."
        );
        require(
            minCommit <= commitments[msg.sender] + amount && commitments[msg.sender] + amount <= maxCommit,
            "Commitment amount is outside the allowed range."
        );
        commitments[msg.sender] += amount;
        totalCommitments += amount;
        missedSales[msg.sender] += calculateEmission(amount);
        emit Commit(msg.sender, amount);
    }

    function simulateClaim(address user) external returns (uint256, uint256, uint256) {
        _updateEmission();
        if (finalSales[user] > 0) {
            return (0, finalSales[user], finalEmissions[user]);
        }

        if (commitments[user] == 0) return (0, 0, 0);

        if (totalCommitments >= refundThreshold) {
            uint256 salesToSpend = Math.min(commitments[user], (commitments[user] * ethersToRaise) / totalCommitments);
            uint256 salesToRefund = commitments[user] - salesToSpend;        
            uint256 totalSalesToReceive = salesToken.balanceOf(address(this)) - totalCommitments;
            uint256 salesToReceive = (calculateEmission(commitments[user]) - missedSales[user]) * totalSalesToReceive / totalEmission;
            uint256 emissionToReceive = (salesToSpend * emissionPerUsdPlus) / 10 ** 18;

            return (salesToRefund, salesToReceive, emissionToReceive);
        } else {
            return (commitments[user], 0, 0);
        }
    }

    function claim() external nonReentrant returns (uint256, uint256, uint256) {

        if (!finished) {
            finish();
        }

        _updateEmission();
        require(block.timestamp > endTime, "Can only claim tokens after the sale has ended.");
        require(commitments[msg.sender] > 0, "You have not deposited any Ether.");

        if (totalCommitments >= refundThreshold) {
            console.log("here");
            uint256 salesToSpend = Math.min(commitments[msg.sender], (commitments[msg.sender] * ethersToRaise) / totalCommitments);
            uint256 salesToRefund = commitments[msg.sender] - salesToSpend;
            console.log("calculateEmission(commitments[msg.sender])", calculateEmission(commitments[msg.sender]));
            console.log("missedSales[msg.sender]", missedSales[msg.sender]);
            console.log("totalSalesBalanceToReceive", totalSalesBalanceToReceive);
            console.log("totalEmission", totalEmission);
            uint256 salesToReceive = (calculateEmission(commitments[msg.sender]) - missedSales[msg.sender]) * totalSalesBalanceToReceive / totalEmission;
            uint256 emissionToReceive = (salesToSpend * emissionPerUsdPlus) / 10 ** 6;
            console.log("salesToSpend", salesToSpend);
            console.log("salesToRefund", salesToRefund);
            console.log("salesToReceive", salesToReceive);
            console.log("emissionToReceive", emissionToReceive);

            commitments[msg.sender] = 0;

            finalEmissions[msg.sender] = emissionToReceive;
            finalSales[msg.sender] = salesToReceive;

            salesToken.safeTransfer(msg.sender, salesToRefund);            
            emit Claim(msg.sender, salesToRefund, salesToReceive, emissionToReceive);
            return (salesToRefund, salesToReceive, emissionToReceive);
        } else {
            uint256 amt = commitments[msg.sender];
            commitments[msg.sender] = 0;
            salesToken.safeTransfer(msg.sender, amt);   
            emit Claim(msg.sender, amt, 0, 0);
            return (amt, 0, 0);
        }
    }

    function claim2() external nonReentrant {
        require(block.timestamp >= receiveTime, "not claimable yet");
        uint256 a1 = finalSales[msg.sender];
        uint256 a2 = finalEmissions[msg.sender];
        require(a1 != 0 || a2 != 0, "not zero final values");
        finalSales[msg.sender] = 0;
        finalEmissions[msg.sender] = 0;

        uint256 vesting = a2 * vestingProportion / 1e18;
        _grantVestedReward(msg.sender, vesting);

        emissionToken.safeTransfer(msg.sender, a2 - vesting);
        salesToken.safeTransfer(msg.sender, a1);
        transferedSalesBalanceToReceive += a1;
        emit Claim2(msg.sender, a1, a2);
    }

    function finish() public onlyOwner {
        require(block.timestamp > endTime, "Can only finish after the sale has ended.");
        require(!finished, "Already finished.");
        finished = true;

        console.log("salesToken.balanceOf(address(this)", salesToken.balanceOf(address(this)));
        console.log("ethersToRaise", ethersToRaise);
        console.log("totalCommitments", totalCommitments);
        console.log("refundThreshold", refundThreshold);

        if (totalCommitments >= refundThreshold) {
            salesToken.safeTransfer(owner(), Math.min(ethersToRaise, totalCommitments));
        } else {
            salesToken.safeTransfer(owner(), salesToken.balanceOf(address(this)) - totalCommitments);
            emissionToken.safeTransfer(owner(), totalEmission);
        }

        totalSalesBalanceToReceive = salesToken.balanceOf(address(this));
        console.log("totalSalesBalanceToReceive", totalSalesBalanceToReceive);
    }

    function takeSalesOverflowRebase() external onlyOwner {
        require(block.timestamp > receiveTime, "Can take sales overflow rebase only after receiveTime.");
        require(finished, "Not finished yet.");
        
        uint256 amount = salesToken.balanceOf(address(this)) - (totalSalesBalanceToReceive - transferedSalesBalanceToReceive);
        salesToken.safeTransfer(owner(), amount);
    }

    function donate() external payable {
        // Anyone can donate a few gwei to fix integer division accuracy issues.
        // Typically, the deployer will call this.
    }

    function addToWhitelist(address[] calldata toAddAddresses)
    external onlyOwner
    {
        for (uint i = 0; i < toAddAddresses.length; i++) {
            whitelist[toAddAddresses[i]] = true;
        }
    }

    /**
     * @notice Remove from whitelist
     */
    function removeFromWhitelist(address[] calldata toRemoveAddresses)
    external onlyOwner
    {
        for (uint i = 0; i < toRemoveAddresses.length; i++) {
            delete whitelist[toRemoveAddresses[i]];
        }
    }

}
