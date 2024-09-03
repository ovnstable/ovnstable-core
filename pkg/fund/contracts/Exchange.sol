// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "./interfaces/IMark2Market.sol";
import "./interfaces/IPortfolioManager.sol";
import "./interfaces/IBlockGetter.sol";
import "./interfaces/IRoleManager.sol";
import "./interfaces/IStrategy.sol";
import "./interfaces/IUsdPlusToken.sol";


contract Exchange is Initializable, AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {
    bytes32 public constant PORTFOLIO_AGENT_ROLE = keccak256("PORTFOLIO_AGENT_ROLE");
    bytes32 public constant UNIT_ROLE = keccak256("UNIT_ROLE");

    uint256 public constant LIQ_DELTA_DM   = 1e6;

    // ---  fields

    IUsdPlusToken public usdPlus;
    IERC20 public usdc; // asset name

    IPortfolioManager public portfolioManager; // portfolio manager contract
    IMark2Market public mark2market;

    uint256 totalDeposit;

    // next payout time in epoch seconds
    uint256 public nextPayoutTime;

    // period between payouts in seconds, need to calc nextPayoutTime
    uint256 public payoutPeriod;

    // range of time for starting near next payout time at seconds
    // if time in [nextPayoutTime-payoutTimeRange;nextPayoutTime+payoutTimeRange]
    //    then payouts can be started by payout() method anyone
    // else if time more than nextPayoutTime+payoutTimeRange
    //    then payouts started by any next buy/redeem
    uint256 public payoutTimeRange;

    // last block number when buy/redeem was executed
    uint256 public lastBlockNumber;

    address public blockGetter;
    IRoleManager public roleManager;

    // ---  events

    event TokensUpdated(address usdPlus, address asset);
    event Mark2MarketUpdated(address mark2market);
    event RoleManagerUpdated(address roleManager);
    event PortfolioManagerUpdated(address portfolioManager);
    event BuyFeeUpdated(uint256 fee, uint256 feeDenominator);
    event RedeemFeeUpdated(uint256 fee, uint256 feeDenominator);
    event ProfitFeeUpdated(uint256 fee, uint256 feeDenominator);
    event PayoutTimesUpdated(uint256 nextPayoutTime, uint256 payoutPeriod, uint256 payoutTimeRange);
    event PayoutManagerUpdated(address payoutManager);
    event InsuranceUpdated(address insurance);
    event BlockGetterUpdated(address blockGetter);

    event EventExchange(string label, uint256 amount, address sender);
    event PayoutEvent(
        uint256 profit
    );
    event PaidBuyFee(uint256 amount, uint256 feeAmount);
    event PaidRedeemFee(uint256 amount, uint256 feeAmount);
    event NextPayoutTime(uint256 nextPayoutTime);
    event OnNotEnoughLimitRedeemed(address token, uint256 amount);
    event PayoutAbroad(uint256 delta, uint256 deltaUsdPlus);
    event MaxAbroad(uint256 abroad);
    event ProfitRecipientUpdated(address recipient);
    event OracleLossUpdate(uint256 oracleLoss, uint256 denominator);
    event CompensateLossUpdate(uint256 compensateLoss, uint256 denominator);

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyPortfolioAgent() {
        require(roleManager.hasRole(PORTFOLIO_AGENT_ROLE, msg.sender), "Restricted to Portfolio Agent");
        _;
    }

    modifier onlyUnit(){
        require(roleManager.hasRole(UNIT_ROLE, msg.sender), "Restricted to Unit");
        _;
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() initializer public {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // 1637193600 = 2021-11-18T00:00:00Z
        nextPayoutTime = 1637193600; // TODO: change

        payoutPeriod = 24 * 60 * 60 * 30;

        payoutTimeRange = 24 * 60 * 60 * 30; // 24 hours * 30
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(DEFAULT_ADMIN_ROLE)
    override
    {}


    // ---  setters Admin

    function setTokens(address _usdPlus, address _asset) external onlyAdmin {
        require(_usdPlus != address(0), "Zero address not allowed");
        require(_asset != address(0), "Zero address not allowed");
        usdPlus = IUsdPlusToken(_usdPlus);
        usdc = IERC20(_asset);
        emit TokensUpdated(_usdPlus, _asset);
    }

    function setPortfolioManager(address _portfolioManager) external onlyAdmin {
        require(_portfolioManager != address(0), "Zero address not allowed");
        portfolioManager = IPortfolioManager(_portfolioManager);
        emit PortfolioManagerUpdated(_portfolioManager);
    }

    function setMark2Market(address _mark2market) external onlyAdmin {
        require(_mark2market != address(0), "Zero address not allowed");
        mark2market = IMark2Market(_mark2market);
        emit Mark2MarketUpdated(_mark2market);
    }

    function setRoleManager(address _roleManager) external onlyAdmin {
        require(_roleManager != address(0), "Zero address not allowed");
        roleManager = IRoleManager(_roleManager);
        emit RoleManagerUpdated(_roleManager);
    }

    function setBlockGetter(address _blockGetter) external onlyAdmin {
        // blockGetter can be empty
        blockGetter = _blockGetter;
        emit BlockGetterUpdated(_blockGetter);
    }

    // ---  setters Portfolio Manager

    function setPayoutTimes(
        uint256 _nextPayoutTime,
        uint256 _payoutPeriod,
        uint256 _payoutTimeRange
    ) external onlyPortfolioAgent {
        require(_nextPayoutTime != 0, "Zero _nextPayoutTime not allowed");
        require(_payoutPeriod != 0, "Zero _payoutPeriod not allowed");
        require(_nextPayoutTime > _payoutTimeRange, "_nextPayoutTime shoud be more than _payoutTimeRange");
        nextPayoutTime = _nextPayoutTime;
        payoutPeriod = _payoutPeriod;
        payoutTimeRange = _payoutTimeRange;
        emit PayoutTimesUpdated(nextPayoutTime, payoutPeriod, payoutTimeRange);
    }

    // ---  logic

    function pause() public onlyPortfolioAgent {
        _pause();
    }

    function unpause() public onlyPortfolioAgent {
        _unpause();
    }

    struct MutabilityParams {
        address asset;   // USDC | BUSD depends at chain
        uint256 amount;  // amount asset
    }

    
    function deposit(address _asset, uint256 _amount) external whenNotPaused nonReentrant onlyAdmin { // for depositor
        require(_asset == address(usdc), "Only asset available for buy");

        uint256 currentBalance = usdc.balanceOf(msg.sender);
        require(currentBalance >= _amount, "Not enough tokens to buy");

        require(_amount > 0, "Amount of asset is zero");

        uint256 _targetBalance = usdc.balanceOf(address(portfolioManager)) + _amount;
        SafeERC20.safeTransferFrom(usdc, msg.sender, address(portfolioManager), _amount);
        require(usdc.balanceOf(address(portfolioManager)) == _targetBalance, 'pm balance != target');

        totalDeposit += _amount;

        portfolioManager.deposit();
        _requireOncePerBlock(false);
    }

    function withdrawDeposit(address _asset, uint256 _amount) external whenNotPaused nonReentrant onlyAdmin returns (uint256) { // for depositor
        require(_asset == address(usdc), "Only asset available for redeem");
        require(_amount > 0, "Amount of USD+ is zero");
        require(usdPlus.balanceOf(msg.sender) >= _amount, "Not enough tokens to redeem");

        uint256 redeemAmount = _rebaseToAsset(_amount);
        require(redeemAmount > 0, "Amount of asset is zero");

        (, bool isBalanced) = portfolioManager.withdraw(redeemAmount);
        _requireOncePerBlock(isBalanced);

        require(usdc.balanceOf(address(this)) >= redeemAmount, "Not enough for transfer redeemAmount");
        SafeERC20.safeTransfer(usdc, msg.sender, redeemAmount);

        totalDeposit -= _amount;

        emit EventExchange("Withdraw", redeemAmount, msg.sender);

        return redeemAmount;
    }

    function withdraw(MutabilityParams calldata params) external whenNotPaused nonReentrant returns (uint256) {
        _withdraw(params.asset, params.amount);
    }


    /**
     * @param _asset Asset to redeem
     * @param _amount Amount of USD+ to burn
     * @return Amount of asset unstacked and transferred to caller
     */
    function _withdraw(address _asset, uint256 _amount) internal whenNotPaused nonReentrant returns (uint256) {
        require(_asset == address(usdc), "Only asset available for redeem");
        require(_amount > 0, "Amount of USD+ is zero");
        require(usdPlus.balanceOf(msg.sender) >= _amount, "Not enough tokens to redeem");

        uint256 assetAmount = _rebaseToAsset(_amount);
        require(assetAmount > 0, "Amount of asset is zero");

        (, bool isBalanced) = portfolioManager.withdraw(assetAmount);
        _requireOncePerBlock(isBalanced);

        // Or just burn from sender
        usdPlus.burn(msg.sender, _amount);

        require(usdc.balanceOf(address(this)) >= assetAmount, "Not enough for transfer assetAmount");
        SafeERC20.safeTransfer(usdc, msg.sender, assetAmount);

        emit EventExchange("redeem", assetAmount, msg.sender);

        return assetAmount;
    }

    function mint(MutabilityParams calldata params) external whenNotPaused nonReentrant returns (uint256) {
        return _mint(params.asset, params.amount);
    }

    /**
     * @param _asset Asset to spend
     * @param _amount Amount of asset to spend
     * @return Amount of minted USD+ to caller
     */
    function _mint(address _asset, uint256 _amount) internal returns (uint256) {
        require(_asset == address(usdc), "Only asset available for buy");

        uint256 currentBalance = usdc.balanceOf(msg.sender);
        require(currentBalance >= _amount, "Not enough tokens to buy");

        require(_amount > 0, "Amount of asset is zero");

        uint256 usdPlusAmount = _assetToRebase(_amount);
        require(usdPlusAmount > 0, "Amount of USD+ is zero");

        uint256 _targetBalance = usdc.balanceOf(address(portfolioManager)) + _amount;
        SafeERC20.safeTransferFrom(usdc, msg.sender, address(portfolioManager), _amount);
        require(usdc.balanceOf(address(portfolioManager)) == _targetBalance, 'pm balance != target');

        portfolioManager.deposit();
        _requireOncePerBlock(false);

        usdPlus.mint(msg.sender, usdPlusAmount);

        emit EventExchange("mint", usdPlusAmount, msg.sender);

        return usdPlusAmount;
    }


    /**
     * @dev Protect from flashloan attacks
     * Allow execute only one mint or redeem transaction in per block
     * ONLY if balance function triggered on PortfolioManager
     * in other cases: stake/unstake only from cash strategy is safe
     */

    function _requireOncePerBlock(bool isBalanced) internal {

        uint256 blockNumber;

        // Arbitrum when call block.number return blockNumber from L1(mainnet)
        // To get a valid block, we use a BlockGetter contract with its own implementation of getting a block.number from L2(Arbitrum)

        // What is it needed?
        // 15 seconds ~ average time for a new block to appear on the mainnet

        // User1 send transaction mint:
        // - l1.blockNumber = 100
        // - l2.blockNumber = 60000
        // 5 seconds later
        // User2 send transaction mint:
        // - l1.blockNumber = 100
        // - l2.blockNumber = 60001
        // If blockNumber from L1 then tx be revert("Only once in block")
        // If blockNumber from L2 then tx be success mint!

        if (blockGetter != address(0)) {
            blockNumber = IBlockGetter(blockGetter).getNumber();
        } else {
            blockNumber = block.number;
        }

        // Flag isBalanced take about:
        // PortfolioManager run balance function and unstake liquidity from non cash strategies
        // Check is not actual if stake/unstake will be only from cash strategy (for example Aave or Venus)
        if (isBalanced) {
            require(lastBlockNumber < blockNumber, "Only once in block");
        }

        lastBlockNumber = blockNumber;
    }


    function _rebaseToAsset(uint256 _amount) internal view returns (uint256){

        uint256 assetDecimals = IERC20Metadata(address(usdc)).decimals();
        uint256 usdPlusDecimals = usdPlus.decimals();
        if (assetDecimals > usdPlusDecimals) {
            _amount = _amount * (10 ** (assetDecimals - usdPlusDecimals));
        } else {
            _amount = _amount / (10 ** (usdPlusDecimals - assetDecimals));
        }

        return _amount;
    }


    function _assetToRebase(uint256 _amount) internal view returns (uint256){

        uint256 assetDecimals = IERC20Metadata(address(usdc)).decimals();
        uint256 usdPlusDecimals = usdPlus.decimals();
        if (assetDecimals > usdPlusDecimals) {
            _amount = _amount / (10 ** (assetDecimals - usdPlusDecimals));
        } else {
            _amount = _amount * (10 ** (usdPlusDecimals - assetDecimals));
        }
        return _amount;
    }

    /**
     * @dev Payout
     * The root method of protocol USD+
     * Calculates delta total NAV - total supply USD+ and accrues profit or loss among all token holders
     *
     * What do method?
     * - Claim rewards from all strategy
     * - Increase liquidity index USD+ on amount of profit
     * - Decrease liquidity index USD+ on amount of loss
     *
     * Support Insurance mode: Only if insurance is set
     * What the Insurance to do?
     * If USD+ has Loss then Exchange coverts the loss through Insurance
     * if USD+ has profit then Exchange send premium amount to Insurance
     */
    function payout() external whenNotPaused onlyUnit nonReentrant returns (int256 swapAmount) {

        if (block.timestamp + payoutTimeRange < nextPayoutTime) {
            return 0;
        }

        portfolioManager.claimAndBalance();

        uint256 usdPlusSupply = usdPlus.totalSupply(); 
        uint256 totalUsdPlus = usdPlusSupply + totalDeposit;
        uint256 previousUsdPlus = totalUsdPlus;

        uint256 totalNav = _assetToRebase(mark2market.totalNetAssets());
        uint256 loss;

        uint256 delta;

        if (totalUsdPlus > totalNav) {
            loss = totalUsdPlus - totalNav;
            if (usdPlusSupply > loss) {
                usdPlus.changeNegativeSupply(usdPlusSupply - loss);
                return 0;
            } else {
                revert("This rebase will remove all team funds");
            }
        } else {
            delta = totalNav * LIQ_DELTA_DM / (usdPlus.totalSupply() + totalDeposit);
        }


        // In case positive rebase and negative rebase the value changes and we must update it:
        // - totalUsdPlus
        // - totalNav

        totalUsdPlus = usdPlus.totalSupply() + totalDeposit;
        totalNav = _assetToRebase(mark2market.totalNetAssets());

        require(totalNav >= totalUsdPlus, 'negative rebase');

        // Calculating how much users profit after excess fee
        uint256 profit = totalNav - totalUsdPlus;

        uint256 expectedTotalUsdPlus = previousUsdPlus + profit;

        usdPlus.changeSupply(totalNav, totalDeposit);

        

        require(usdPlus.totalSupply() + totalDeposit == totalNav, 'total != nav');
        require(usdPlus.totalSupply() + totalDeposit == expectedTotalUsdPlus, 'total != expected');

        emit PayoutEvent(
            profit
        );

        // Update next payout time. Cycle for preventing gaps
        // Allow execute payout every day in one time (10:00)

        // If we cannot execute payout (for any reason) in 10:00 and execute it in 15:00
        // then this cycle make 1 iteration and next payout time will be same 10:00 in next day

        // If we cannot execute payout more than 2 days and execute it in 15:00
        // then this cycle make 3 iteration and next payout time will be same 10:00 in next day

        for (; block.timestamp >= nextPayoutTime - payoutTimeRange;) {
            nextPayoutTime = nextPayoutTime + payoutPeriod;
        }
        emit NextPayoutTime(nextPayoutTime);

        // If this is not a simulation, then we return the value is not used in any way
        return 0;
    }

    function getAvailabilityInfo() external view returns(uint256 _available, bool _paused, bool _deprecated) {
        _paused = paused() || usdPlus.isPaused();

        IPortfolioManager.StrategyWeight[] memory weights = portfolioManager.getAllStrategyWeights();
        uint256 count = weights.length;

        for (uint8 i = 0; i < count; i++) {
            IPortfolioManager.StrategyWeight memory weight = weights[i];
            IStrategy strategy = IStrategy(weight.strategy);

            if (weight.enabled) {
                _available += strategy.netAssetValue();
            }
        }
    }
}