// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

// Importing interfaces and modifiers
import "./interfaces/IPortfolioManager.sol";
import "./interfaces/IBlockGetter.sol";
import "./interfaces/IRoleManager.sol";
import "./interfaces/IStrategy.sol";
import "./interfaces/IMotivationalFund.sol";
import "./interfaces/Modifiers.sol";

/// @title FundExchange
/// @notice Manages the exchange of assets with the MotivationalFund, handling deposits, withdrawals, and payouts.
/// @dev Inherits multiple OpenZeppelin contracts for security and upgradeability.
contract FundExchange is
    Modifiers,
    UUPSUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable
{
    // --- Fields ---

    /// @notice The MotivationalFund contract instance.
    IMotivationalFund public fund;

    /// @notice The ERC20 token used as the asset (e.g., USDC).
    IERC20 public usdc;

    /// @notice The PortfolioManager contract instance.
    IPortfolioManager public portfolioManager;

    /// @notice Total amount of assets deposited by DEPOSITOR.
    uint256 public totalDeposit;

    /// @notice The next payout time in epoch seconds.
    uint256 public nextPayoutTime;

    /// @notice The period between payouts in seconds.
    uint256 public payoutPeriod;

    /// @notice The time range around the next payout time when payouts can be initiated.
    uint256 public payoutTimeRange;

    /// @notice The last block number when a buy/redeem was executed.
    uint256 public lastBlockNumber;

    /// @notice The address of the block number getter contract (used for L2 solutions like Arbitrum).
    address public blockGetter;

    // --- Events ---

    event TokensUpdated(address fund, address asset);
    event PortfolioManagerUpdated(address portfolioManager);
    event PayoutTimesUpdated(
        uint256 nextPayoutTime,
        uint256 payoutPeriod,
        uint256 payoutTimeRange
    );
    event BlockGetterUpdated(address blockGetter);

    event EventExchange(string label, uint256 amount, address sender);
    event PayoutEvent(uint256 profit);
    event NextPayoutTime(uint256 nextPayoutTime);

    // --- Constructor ---

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract with default payout settings.
     */
    function initialize() public initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        payoutPeriod = 24 * 60 * 60 * 30; // Default to 30 days

        payoutTimeRange = 24 * 60 * 60 * 30; // 30 days time range

        nextPayoutTime = block.timestamp + payoutPeriod;
    }

    /**
     * @notice Authorizes an upgrade to a new implementation.
     * @param newImplementation The address of the new contract implementation.
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}

    // --- Admin Setters ---

    /**
     * @notice Sets the addresses for the fund and asset tokens.
     * @param _fund The address of the MotivationalFund contract.
     * @param _asset The address of the asset token (e.g., USDC).
     */
    function setTokens(address _fund, address _asset) external onlyAdmin {
        require(_fund != address(0), "Zero address not allowed");
        require(_asset != address(0), "Zero address not allowed");
        fund = IMotivationalFund(_fund);
        usdc = IERC20(_asset);
        emit TokensUpdated(_fund, _asset);
    }

    /**
     * @notice Sets the PortfolioManager contract address.
     * @param _portfolioManager The address of the PortfolioManager contract.
     */
    function setPortfolioManager(address _portfolioManager)
        external
        onlyAdmin
    {
        require(_portfolioManager != address(0), "Zero address not allowed");
        portfolioManager = IPortfolioManager(_portfolioManager);
        emit PortfolioManagerUpdated(_portfolioManager);
    }

    /**
     * @notice Sets the BlockGetter contract address (used for L2 solutions).
     * @param _blockGetter The address of the BlockGetter contract.
     */
    function setBlockGetter(address _blockGetter) external onlyAdmin {
        // blockGetter can be empty
        blockGetter = _blockGetter;
        emit BlockGetterUpdated(_blockGetter);
    }

    // --- Portfolio Manager Setters ---

    /**
     * @notice Sets payout timing configurations.
     * @param _nextPayoutTime The next payout time in epoch seconds.
     * @param _payoutPeriod The period between payouts in seconds.
     * @param _payoutTimeRange The time range around the next payout time when payouts can be initiated.
     */
    function setPayoutTimes(
        uint256 _nextPayoutTime,
        uint256 _payoutPeriod,
        uint256 _payoutTimeRange
    ) external onlyPortfolioAgent {
        require(_nextPayoutTime != 0, "Zero _nextPayoutTime not allowed");
        require(_payoutPeriod != 0, "Zero _payoutPeriod not allowed");
        require(
            _nextPayoutTime > _payoutTimeRange,
            "_nextPayoutTime should be more than _payoutTimeRange"
        );
        nextPayoutTime = _nextPayoutTime;
        payoutPeriod = _payoutPeriod;
        payoutTimeRange = _payoutTimeRange;
        emit PayoutTimesUpdated(nextPayoutTime, payoutPeriod, payoutTimeRange);
    }

    // --- Contract Logic ---

    /**
     * @notice Pauses the contract, disabling certain functions.
     */
    function pause() public onlyPortfolioAgent {
        _pause();
    }

    /**
     * @notice Unpauses the contract, enabling certain functions.
     */
    function unpause() public onlyPortfolioAgent {
        _unpause();
    }

    /**
     * @notice Allows a user to withdraw their funds.
     * @param _amount The amount of FUND tokens to withdraw.
     * @return The amount of asset tokens withdrawn.
     */
    function withdraw(uint256 _amount)
        external
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        return _withdraw(_amount);
    }

    /**
     * @notice Allows the depositor to withdraw a specified amount.
     * @param _amount The amount of asset tokens to withdraw.
     * @return withdrawAmount The amount withdrawn.
     */
    function withdrawDeposit(uint256 _amount)
        external
        whenNotPaused
        nonReentrant
        onlyDepositor
        returns (uint256 withdrawAmount)
    {
        require(totalDeposit >= _amount, "Not enough tokens to withdraw");

        withdrawAmount = _withdrawLogic(_amount);
        totalDeposit -= _amount;

        emit EventExchange("withdraw deposit", withdrawAmount, msg.sender);

        return withdrawAmount;
    }

    /**
     * @notice Internal function to handle withdrawals.
     * @param _amount The amount of FUND tokens to withdraw.
     * @return withdrawAmount The amount of asset tokens withdrawn.
     */
    function _withdraw(uint256 _amount)
        internal
        whenNotPaused
        nonReentrant
        returns (uint256 withdrawAmount)
    {
        require(
            fund.balanceOf(msg.sender) >= _amount,
            "Not enough tokens to withdraw"
        );

        withdrawAmount = _withdrawLogic(_amount);
        fund.burn(msg.sender, _amount);

        emit EventExchange("withdraw", withdrawAmount, msg.sender);

        return withdrawAmount;
    }

    /**
     * @notice Core logic for handling withdrawals.
     * @param _amount The amount to withdraw in FUND tokens.
     * @return The amount of asset tokens withdrawn.
     */
    function _withdrawLogic(uint256 _amount)
        internal
        returns (uint256)
    {
        require(_amount > 0, "Amount of FUND is zero");

        uint256 withdrawAmount = _rebaseToAsset(_amount);
        require(withdrawAmount > 0, "Amount of asset is zero");

        // Withdraw from the PortfolioManager
        (, bool isBalanced) = portfolioManager.withdraw(withdrawAmount);
        _requireOncePerBlock(isBalanced);

        require(
            usdc.balanceOf(address(this)) >= withdrawAmount,
            "Not enough for transfer withdrawAmount"
        );
        SafeERC20.safeTransfer(usdc, msg.sender, withdrawAmount);

        return withdrawAmount;
    }

    /**
     * @notice Allows a user to mint FUND tokens by depositing asset tokens.
     * @param _amount The amount of asset tokens to deposit.
     * @return The amount of FUND tokens minted.
     */
    function mint(uint256 _amount)
        external
        whenNotPaused
        nonReentrant
        returns (uint256)
    {
        return _mint(_amount);
    }

    /**
     * @notice Internal function to handle minting of FUND tokens.
     * @param _amount The amount of asset tokens to deposit.
     * @return fundAmount The amount of FUND tokens minted.
     */
    function _mint(uint256 _amount)
        internal
        returns (uint256 fundAmount)
    {
        fundAmount = _mintLogic(_amount);
        fund.mint(msg.sender, _assetToRebase(_amount));

        emit EventExchange("mint", _assetToRebase(_amount), msg.sender);
    }

    /**
     * @notice Allows the depositor to deposit asset tokens.
     * @param _amount The amount of asset tokens to deposit.
     * @return fundAmount The amount of FUND tokens credited.
     */
    function deposit(uint256 _amount)
        external
        whenNotPaused
        nonReentrant
        onlyDepositor
        returns (uint256 fundAmount)
    {
        fundAmount = _mintLogic(_amount);
        totalDeposit += _amount;

        emit EventExchange("deposit", _assetToRebase(_amount), msg.sender);
    }

    /**
     * @notice Core logic for handling minting and deposits.
     * @param _amount The amount of asset tokens to process.
     * @return The equivalent amount in FUND tokens.
     */
    function _mintLogic(uint256 _amount)
        internal
        returns (uint256)
    {
        uint256 currentBalance = usdc.balanceOf(msg.sender);
        require(currentBalance >= _amount, "Not enough tokens to buy");

        require(_amount > 0, "Amount of asset is zero");

        // Transfer assets to the PortfolioManager
        uint256 _targetBalance = usdc.balanceOf(address(portfolioManager)) +
            _amount;
        SafeERC20.safeTransferFrom(
            usdc,
            msg.sender,
            address(portfolioManager),
            _amount
        );
        require(
            usdc.balanceOf(address(portfolioManager)) == _targetBalance,
            "PortfolioManager balance mismatch"
        );

        portfolioManager.deposit();
        _requireOncePerBlock(false);

        return _assetToRebase(_amount);
    }

    /**
     * @notice Ensures that only one mint or redeem transaction is executed per block when necessary.
     * @param isBalanced A flag indicating if the PortfolioManager has rebalanced.
     */
    function _requireOncePerBlock(bool isBalanced) internal {
        uint256 blockNumber;

        // For L2 solutions like Arbitrum, use a custom block number getter
        if (blockGetter != address(0)) {
            blockNumber = IBlockGetter(blockGetter).getNumber();
        } else {
            blockNumber = block.number;
        }

        // If the PortfolioManager has rebalanced, ensure only one transaction per block
        if (isBalanced) {
            require(lastBlockNumber < blockNumber, "Only once per block");
        }

        lastBlockNumber = blockNumber;
    }

    /**
     * @notice Converts FUND token amount to asset token amount based on decimals.
     * @param _amount The amount in FUND tokens.
     * @return The equivalent amount in asset tokens.
     */
    function _rebaseToAsset(uint256 _amount) internal view returns (uint256) {
        uint256 assetDecimals = IERC20Metadata(address(usdc)).decimals();
        uint256 fundDecimals = fund.decimals();
        if (assetDecimals > fundDecimals) {
            _amount = _amount * (10**(assetDecimals - fundDecimals));
        } else {
            _amount = _amount / (10**(fundDecimals - assetDecimals));
        }

        return _amount;
    }

    /**
     * @notice Converts asset token amount to FUND token amount based on decimals.
     * @param _amount The amount in asset tokens.
     * @return The equivalent amount in FUND tokens.
     */
    function _assetToRebase(uint256 _amount) internal view returns (uint256) {
        uint256 assetDecimals = IERC20Metadata(address(usdc)).decimals();
        uint256 fundDecimals = fund.decimals();
        if (assetDecimals > fundDecimals) {
            _amount = _amount / (10**(assetDecimals - fundDecimals));
        } else {
            _amount = _amount * (10**(fundDecimals - assetDecimals));
        }
        return _amount;
    }

    /**
     * @notice Handles the payout process, distributing profits or losses among token holders.
     * @return swapAmount The net amount of profit or loss after payout.
     */
    function payout()
        external
        whenNotPaused
        onlyUnit
        nonReentrant
        returns (int256 swapAmount)
    {
        // Check if it's time for payout
        if (block.timestamp + payoutTimeRange < nextPayoutTime) {
            return 0;
        }

        // Claim rewards and rebalance the portfolio
        portfolioManager.claimAndBalance();

        uint256 fundSupply = fund.totalSupply();
        uint256 totalFund = fundSupply + totalDeposit;
        uint256 totalNav = _assetToRebase(portfolioManager.totalNetAssets());

        if (totalFund > totalNav) {
            // Handle loss scenario
            uint256 loss = totalFund - totalNav;
            fund.changeNegativeSupply(
                fundSupply - (loss * fundSupply) / totalFund
            );
            totalDeposit -= (loss * totalDeposit) / totalFund;
            return 0;
        }

        // Calculate profit
        uint256 profit = totalNav - totalFund;
        uint256 expectedTotalFund = totalFund + profit;

        // Adjust the fund supply
        fund.changeSupply(totalNav, totalDeposit);

        // Ensure consistency
        require(
            fund.totalSupply() + totalDeposit == totalNav,
            "Total supply mismatch with NAV"
        );
        require(
            fund.totalSupply() + totalDeposit == expectedTotalFund,
            "Total supply mismatch with expected"
        );

        emit PayoutEvent(profit);

        // Update the next payout time, ensuring consistent scheduling
        while (block.timestamp >= nextPayoutTime - payoutTimeRange) {
            nextPayoutTime += payoutPeriod;
        }
        emit NextPayoutTime(nextPayoutTime);

        // Return the net profit or loss (unused in this implementation)
        return 0;
    }
}
