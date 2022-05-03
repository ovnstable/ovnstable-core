// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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

    // ---  fields

    UsdPlusToken public usdPlus;
    IERC20 public usdc;

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

    // ---  events

    event TokensUpdated(address usdPlus, address usdc);
    event Mark2MarketUpdated(address mark2market);
    event PortfolioManagerUpdated(address portfolioManager);
    event BuyFeeUpdated(uint256 fee, uint256 feeDenominator);
    event RedeemFeeUpdated(uint256 fee, uint256 feeDenominator);
    event PayoutTimesUpdated(uint256 nextPayoutTime, uint256 payoutPeriod, uint256 payoutTimeRange);
    event PayoutListenerUpdated(address payoutListener);

    event EventExchange(string label, uint256 amount, uint256 fee, address sender);
    event PayoutEvent(
        uint256 totalUsdPlus,
        uint256 totalUsdc,
        uint256 totallyAmountPaid,
        uint256 newLiquidityIndex
    );
    event PaidBuyFee(uint256 amount, uint256 feeAmount);
    event PaidRedeemFee(uint256 amount, uint256 feeAmount);
    event NextPayoutTime(uint256 nextPayoutTime);
    event OnNotEnoughLimitRedeemed(address token, uint256 amount);

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyPausable() {
        require(hasRole(PAUSABLE_ROLE, msg.sender), "Restricted to Pausable");
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
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override
    {}


    // ---  setters

    function setTokens(address _usdPlus, address _usdc) external onlyAdmin {
        require(_usdPlus != address(0), "Zero address not allowed");
        require(_usdc != address(0), "Zero address not allowed");
        usdPlus = UsdPlusToken(_usdPlus);
        usdc = IERC20(_usdc);
        emit TokensUpdated(_usdPlus, _usdc);
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
        require(_payoutListener != address(0), "Zero address not allowed");
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


    function balance() public view returns (uint256) {
        return usdPlus.balanceOf(msg.sender);
    }

    /**
     * @param _addrTok Token to withdraw
     * @param _amount Amount of USD+ tokens to burn
     * @return Amount of minted to caller tokens
     */
    function buy(address _addrTok, uint256 _amount) external whenNotPaused returns (uint256) {
        require(_addrTok == address(usdc), "Only USDC tokens currently available for buy");

        uint256 currentBalance = IERC20(_addrTok).balanceOf(msg.sender);
        require(currentBalance >= _amount, "Not enough tokens to buy");

        IERC20(_addrTok).transferFrom(msg.sender, address(portfolioManager), _amount);
        portfolioManager.deposit(IERC20(_addrTok), _amount);

        uint256 buyFeeAmount = (_amount * buyFee) / buyFeeDenominator;
        uint256 buyAmount = _amount - buyFeeAmount;
        emit PaidBuyFee(buyAmount, buyFeeAmount);

        usdPlus.mint(msg.sender, buyAmount);

        emit EventExchange("buy", buyAmount, buyFeeAmount, msg.sender);

        return buyAmount;
    }

    /**
     * @param _addrTok Token to withdraw
     * @param _amount Amount of USD+ tokens to burn
     * @return Amount of unstacked and transferred to caller tokens
     */
    function redeem(address _addrTok, uint256 _amount) external whenNotPaused returns (uint256) {
        require(_addrTok == address(usdc), "Only USDC tokens currently available for redeem");

        uint256 redeemFeeAmount = (_amount * redeemFee) / redeemFeeDenominator;
        uint256 redeemAmount = _amount - redeemFeeAmount;
        emit PaidRedeemFee(redeemAmount, redeemFeeAmount);

        //TODO: Real unstacked amount may be different to redeemAmount
        uint256 unstakedAmount = portfolioManager.withdraw(IERC20(_addrTok), redeemAmount);

        // Or just burn from sender
        usdPlus.burn(msg.sender, _amount);

        // TODO: check threshhold limits to withdraw deposite
        require(
            IERC20(_addrTok).balanceOf(address(this)) >= unstakedAmount,
            "Not enough for transfer unstakedAmount"
        );
        IERC20(_addrTok).transfer(msg.sender, unstakedAmount);

        emit EventExchange("redeem", redeemAmount, redeemFeeAmount, msg.sender);

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
        // 2. get total sum of USDC we can get from any source
        // 3. calc difference between total count of USD+ and USDC
        // 4. update USD+ liquidity index

        portfolioManager.claimAndBalance();

        uint256 totalUsdPlusSupplyRay = usdPlus.scaledTotalSupply();
        uint256 totalUsdPlusSupply = totalUsdPlusSupplyRay.rayToWad();
        uint256 totalUsdc = mark2market.totalNetAssets();

        uint difference;
        if (totalUsdc <= totalUsdPlusSupply) {
            difference = totalUsdPlusSupply - totalUsdc;
        } else {
            difference = totalUsdc - totalUsdPlusSupply;
        }

        uint256 totalUsdcSupplyRay = totalUsdc.wadToRay();
        // in ray
        uint256 newLiquidityIndex = totalUsdcSupplyRay.rayDiv(totalUsdPlusSupplyRay);
        usdPlus.setLiquidityIndex(newLiquidityIndex);

        // notify listener about payout done
        if (address(payoutListener) != address(0)) {
            payoutListener.payoutDone();
        }

        emit PayoutEvent(
            totalUsdPlusSupply,
            totalUsdc,
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
