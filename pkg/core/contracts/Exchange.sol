// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./interfaces/IMark2Market.sol";
import "./interfaces/IPortfolioManager.sol";
import "./UsdPlusToken.sol";
import "./libraries/WadRayMath.sol";
import "./PayoutListener.sol";


contract Exchange is Initializable, AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable {
    using WadRayMath for uint256;
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PAUSABLE_ROLE = keccak256("PAUSABLE_ROLE");
    bytes32 public constant FREE_RIDER_ROLE = keccak256("FREE_RIDER_ROLE");
    bytes32 public constant PORTFOLIO_AGENT_ROLE = keccak256("PORTFOLIO_AGENT_ROLE");

    // ---  fields

    UsdPlusToken public usdPlus;
    IERC20 public usdc; // asset name

    IPortfolioManager public portfolioManager; //portfolio manager contract
    IMark2Market public mark2market;

    uint256 public buyFee;
    uint256 public buyFeeDenominator; // ~ 100 %

    uint256 public redeemFee;
    uint256 public redeemFeeDenominator; // ~ 100 %

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

    IPayoutListener public payoutListener;

    // last block number when buy/redeem was executed
    uint256 public lastBlockNumber;

    uint256 public abroadMin;
    uint256 public abroadMax;

    // ---  events

    event TokensUpdated(address usdPlus, address asset);
    event Mark2MarketUpdated(address mark2market);
    event PortfolioManagerUpdated(address portfolioManager);
    event BuyFeeUpdated(uint256 fee, uint256 feeDenominator);
    event RedeemFeeUpdated(uint256 fee, uint256 feeDenominator);
    event PayoutTimesUpdated(uint256 nextPayoutTime, uint256 payoutPeriod, uint256 payoutTimeRange);
    event PayoutListenerUpdated(address payoutListener);

    event EventExchange(string label, uint256 amount, uint256 fee, address sender, string referral);
    event PayoutEvent(
        uint256 totalUsdPlus,
        uint256 totalAsset,
        uint256 totallyAmountPaid,
        uint256 newLiquidityIndex
    );
    event PaidBuyFee(uint256 amount, uint256 feeAmount);
    event PaidRedeemFee(uint256 amount, uint256 feeAmount);
    event NextPayoutTime(uint256 nextPayoutTime);
    event OnNotEnoughLimitRedeemed(address token, uint256 amount);
    event PayoutAbroad(uint256 delta, uint256 deltaUsdPlus);
    event Abroad(uint256 min, uint256 max);

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyPausable() {
        require(hasRole(PAUSABLE_ROLE, msg.sender), "Restricted to Pausable");
        _;
    }

    modifier onlyPortfolioAgent() {
        require(hasRole(PORTFOLIO_AGENT_ROLE, msg.sender), "Restricted to Portfolio Agent");
        _;
    }

    modifier oncePerBlock() {
        if (!hasRole(FREE_RIDER_ROLE, msg.sender)) {
            require(lastBlockNumber < block.number, "Only once in block");
        }
        lastBlockNumber = block.number;
        _;
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(PAUSABLE_ROLE, msg.sender);

        buyFee = 40;
        buyFeeDenominator = 100000; // ~ 100 %

        redeemFee = 40;
        redeemFeeDenominator = 100000; // ~ 100 %

        nextPayoutTime = 1637193600; // 1637193600 = 2021-11-18T00:00:00Z

        payoutPeriod = 24 * 60 * 60;

        payoutTimeRange = 15 * 60;

        abroadMin = 1000100;
        abroadMax = 1000350;
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override
    {}


    // ---  setters

    function setTokens(address _usdPlus, address _asset) external onlyAdmin {
        require(_usdPlus != address(0), "Zero address not allowed");
        require(_asset != address(0), "Zero address not allowed");
        usdPlus = UsdPlusToken(_usdPlus);
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

    function setPayoutListener(address _payoutListener) external onlyAdmin {
        payoutListener = IPayoutListener(_payoutListener);
        emit PayoutListenerUpdated(_payoutListener);
    }

    function setBuyFee(uint256 _fee, uint256 _feeDenominator) external onlyAdmin {
        require(_feeDenominator != 0, "Zero denominator not allowed");
        buyFee = _fee;
        buyFeeDenominator = _feeDenominator;
        emit BuyFeeUpdated(buyFee, buyFeeDenominator);
    }

    function setRedeemFee(uint256 _fee, uint256 _feeDenominator) external onlyAdmin {
        require(_feeDenominator != 0, "Zero denominator not allowed");
        redeemFee = _fee;
        redeemFeeDenominator = _feeDenominator;
        emit RedeemFeeUpdated(redeemFee, redeemFeeDenominator);
    }

    function setAbroad(uint256 _min, uint256 _max) external onlyPortfolioAgent {
        abroadMin = _min;
        abroadMax = _max;
        emit Abroad(abroadMin, abroadMax);
    }

    function setPayoutTimes(
        uint256 _nextPayoutTime,
        uint256 _payoutPeriod,
        uint256 _payoutTimeRange
    ) external onlyAdmin {
        require(_nextPayoutTime != 0, "Zero _nextPayoutTime not allowed");
        require(_payoutPeriod != 0, "Zero _payoutPeriod not allowed");
        require(_nextPayoutTime > _payoutTimeRange, "_nextPayoutTime shoud be more than _payoutTimeRange");
        nextPayoutTime = _nextPayoutTime;
        payoutPeriod = _payoutPeriod;
        payoutTimeRange = _payoutTimeRange;
        emit PayoutTimesUpdated(nextPayoutTime, payoutPeriod, payoutTimeRange);
    }

    // ---  logic

    function pause() public onlyPausable {
        _pause();
    }

    function unpause() public onlyPausable {
        _unpause();
    }

    struct MintParams{
        address asset;   // USDC | BUSD depends at chain
        uint256 amount;  // amount asset
        string referral; // code from Referral Program -> if not have -> set empty
    }

    // Minting USD+ in exchange for an asset

    function mint(MintParams calldata params) external whenNotPaused oncePerBlock returns (uint256) {
        return _buy(params.asset, params.amount, params.referral);
    }

    // Deprecated method - not recommended for use
    function buy(address _asset, uint256 _amount) external whenNotPaused oncePerBlock returns (uint256) {
        return _buy(_asset, _amount, "");
    }


    /**
     * @param _asset Asset to spend
     * @param _amount Amount of asset to spend
     * @param _referral Referral code
     * @return Amount of minted USD+ to caller
     */
    function _buy(address _asset, uint256 _amount, string memory _referral) internal  returns (uint256) {
        require(_asset == address(usdc), "Only asset available for buy");

        uint256 currentBalance = IERC20(_asset).balanceOf(msg.sender);
        require(currentBalance >= _amount, "Not enough tokens to buy");

        require(_amount > 0, "Amount of asset is zero");

        uint256 usdPlusAmount;
        uint256 assetDecimals = IERC20Metadata(address(_asset)).decimals();
        uint256 usdPlusDecimals = usdPlus.decimals();
        if (assetDecimals > usdPlusDecimals) {
            usdPlusAmount = _amount / (10 ** (assetDecimals - usdPlusDecimals));
        } else {
            usdPlusAmount = _amount * (10 ** (usdPlusDecimals - assetDecimals));
        }

        require(usdPlusAmount > 0, "Amount of USD+ is zero");

        IERC20(_asset).transferFrom(msg.sender, address(portfolioManager), _amount);
        portfolioManager.deposit(IERC20(_asset), _amount);

        uint256 buyFeeAmount;
        uint256 buyAmount;
        if (!hasRole(FREE_RIDER_ROLE, msg.sender)) {
            buyFeeAmount = (usdPlusAmount * buyFee) / buyFeeDenominator;
            buyAmount = usdPlusAmount - buyFeeAmount;
            emit PaidBuyFee(buyAmount, buyFeeAmount);
        } else {
            buyAmount = usdPlusAmount;
        }

        usdPlus.mint(msg.sender, buyAmount);

        emit EventExchange("mint", buyAmount, buyFeeAmount, msg.sender, _referral);

        return buyAmount;
    }

    /**
     * @param _asset Asset to redeem
     * @param _amount Amount of USD+ to burn
     * @return Amount of asset unstacked and transferred to caller
     */
    function redeem(address _asset, uint256 _amount) external whenNotPaused oncePerBlock returns (uint256) {
        require(_asset == address(usdc), "Only asset available for redeem");

        require(_amount > 0, "Amount of USD+ is zero");

        uint256 assetAmount;
        uint256 assetDecimals = IERC20Metadata(address(_asset)).decimals();
        uint256 usdPlusDecimals = usdPlus.decimals();
        if (assetDecimals > usdPlusDecimals) {
            assetAmount = _amount * (10 ** (assetDecimals - usdPlusDecimals));
        } else {
            assetAmount = _amount / (10 ** (usdPlusDecimals - assetDecimals));
        }

        require(assetAmount > 0, "Amount of asset is zero");

        uint256 redeemFeeAmount;
        uint256 redeemAmount;
        if (!hasRole(FREE_RIDER_ROLE, msg.sender)) {
            redeemFeeAmount = (assetAmount * redeemFee) / redeemFeeDenominator;
            redeemAmount = assetAmount - redeemFeeAmount;
            emit PaidRedeemFee(redeemAmount, redeemFeeAmount);
        } else {
            redeemAmount = assetAmount;
        }

        //TODO: Real unstaked amount may be different to redeemAmount
        uint256 unstakedAmount = portfolioManager.withdraw(IERC20(_asset), redeemAmount);

        // Or just burn from sender
        usdPlus.burn(msg.sender, _amount);

        // TODO: check threshold limits to withdraw deposit
        require(
            IERC20(_asset).balanceOf(address(this)) >= unstakedAmount,
            "Not enough for transfer unstakedAmount"
        );
        IERC20(_asset).transfer(msg.sender, unstakedAmount);

        emit EventExchange("redeem", redeemAmount, redeemFeeAmount, msg.sender, "");

        return unstakedAmount;
    }

    function payout() public whenNotPaused {
        _payout();
    }

    function _payout() internal {
        if (block.timestamp + payoutTimeRange < nextPayoutTime) {
            return;
        }

        // 0. call claiming reward and balancing on PM
        // 1. get current amount of USD+
        // 2. get total sum of asset we can get from any source
        // 3. calc difference between total count of USD+ and asset
        // 4. update USD+ liquidity index

        portfolioManager.claimAndBalance();

        uint256 totalUsdPlusSupplyRay = usdPlus.scaledTotalSupply();
        uint256 totalUsdPlusSupply = totalUsdPlusSupplyRay.rayToWad();
        uint256 totalAsset = mark2market.totalNetAssets();

        uint256 assetDecimals = IERC20Metadata(address(usdc)).decimals();
        uint256 usdPlusDecimals = usdPlus.decimals();
        if (assetDecimals > usdPlusDecimals) {
            totalAsset = totalAsset / (10 ** (assetDecimals - usdPlusDecimals));
        } else {
            totalAsset = totalAsset * (10 ** (usdPlusDecimals - assetDecimals));
        }

        uint difference;
        if (totalAsset <= totalUsdPlusSupply) {
            difference = totalUsdPlusSupply - totalAsset;
        } else {
            difference = totalAsset - totalUsdPlusSupply;
        }

        uint256 totalAssetSupplyRay = totalAsset.wadToRay();
        // in ray
        uint256 newLiquidityIndex = totalAssetSupplyRay.rayDiv(totalUsdPlusSupplyRay);
        uint256 currentLiquidityIndex = usdPlus.liquidityIndex();

        uint256 delta = (newLiquidityIndex * 1e6) / currentLiquidityIndex;

        if (delta <= abroadMin) {
            revert('Delta abroad:min');
        }

        if (abroadMax <= delta) {
            revert('Delta abroad:max');
        }

        usdPlus.setLiquidityIndex(newLiquidityIndex);

        // notify listener about payout done
        if (address(payoutListener) != address(0)) {
            payoutListener.payoutDone();
        }

        emit PayoutEvent(
            totalUsdPlusSupply,
            totalAsset,
            difference,
            newLiquidityIndex
        );

        // update next payout time. Cycle for preventing gaps
        for (; block.timestamp >= nextPayoutTime - payoutTimeRange;) {
            nextPayoutTime = nextPayoutTime + payoutPeriod;
        }
        emit NextPayoutTime(nextPayoutTime);
    }
}
