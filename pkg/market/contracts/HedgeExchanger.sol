// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./libraries/WadRayMath.sol";
import "./interfaces/IRebaseToken.sol";
import "./interfaces/IUsdPlusToken.sol";
import "./interfaces/IExchange.sol";
import "./interfaces/IHedgeStrategy.sol";


contract HedgeExchanger is Initializable, AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable {
    using WadRayMath for uint256;
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PAUSABLE_ROLE = keccak256("PAUSABLE_ROLE");

    // ---  fields

    IExchange public exchange;
    IHedgeStrategy public strategy;
    IUsdPlusToken public usdPlus;
    IERC20 public usdc;
    IRebaseToken public rebase;

    address collector;

    uint256 public buyFee;
    uint256 public buyFeeDenominator; // ~ 100 %

    uint256 public redeemFee;
    uint256 public redeemFeeDenominator; // ~ 100 %

    uint256 public tvlFee;
    uint256 public tvlFeeDenominator; // ~ 100 %

    uint256 public profitFee;
    uint256 public profitFeeDenominator; // ~ 100 %

    uint256 public nextPayoutTime;
    uint256 public payoutPeriod;
    uint256 public payoutTimeRange;

    uint256 public lastBlockNumber;


    // ---  events

    event TokensUpdated(address usdPlus, address rebase, address usdc);

    event CollectorUpdated(address collector);
    event BuyFeeUpdated(uint256 fee, uint256 feeDenominator);
    event TvlFeeUpdated(uint256 fee, uint256 feeDenominator);
    event ProfitFeeUpdated(uint256 fee, uint256 feeDenominator);
    event RedeemFeeUpdated(uint256 fee, uint256 feeDenominator);

    event PayoutTimesUpdated(uint256 nextPayoutTime, uint256 payoutPeriod, uint256 payoutTimeRange);

    event EventExchange(string label, uint256 amount, uint256 fee, address sender);
    event PayoutEvent(uint256 tvlFee, uint256 profitFee, uint256 profit, uint256 loss);
    event NextPayoutTime(uint256 nextPayoutTime);


    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyPausable() {
        require(hasRole(PAUSABLE_ROLE, msg.sender), "Restricted to Pausable");
        _;
    }

    modifier oncePerBlock() {
        require(lastBlockNumber < block.number, "Only once in block");
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

        buyFee = 40; // 0.04%
        buyFeeDenominator = 100000; // ~ 100 %

        redeemFee = 40; // 0.04%
        redeemFeeDenominator = 100000; // ~ 100 %

        tvlFee = 1000; // 1%
        tvlFeeDenominator = 100000; // ~ 100 %

        profitFee = 10000; // 10%
        profitFeeDenominator = 100000; // ~ 100 %

        nextPayoutTime = 1637193600;  // 1637193600 = 2021-11-18T00:00:00Z
        payoutPeriod = 24 * 60 * 60;
        payoutTimeRange = 15 * 60;

    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override
    {}


    // ---  setters

    function setCollector(address _collector ) external onlyAdmin {
        require(_collector != address(0), "Zero address not allowed");
        collector = _collector;
        emit CollectorUpdated(_collector);

    }

    function setTokens(address _usdPlus, address _rebase, address _usdc) external onlyAdmin {
        require(_usdPlus != address(0), "Zero address not allowed");
        require(_rebase != address(0), "Zero address not allowed");
        require(_usdc != address(0), "Zero address not allowed");
        usdPlus = IUsdPlusToken(_usdPlus);
        rebase = IRebaseToken(_rebase);
        usdc = IERC20(_usdc);
        emit TokensUpdated(_usdPlus, _rebase, _usdc);
    }

    function setStrategy(address _strategy) external onlyAdmin {
        require(_strategy != address(0), "Zero address not allowed");
        strategy = IHedgeStrategy(_strategy);
    }

    function setExchanger(address _exchanger) external onlyAdmin {
        require(_exchanger != address(0), "Zero address not allowed");
        exchange = IExchange(_exchanger);
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

    function setTvlFee(uint256 _fee, uint256 _feeDenominator) external onlyAdmin {
        require(_feeDenominator != 0, "Zero denominator not allowed");
        tvlFee = _fee;
        tvlFeeDenominator = _feeDenominator;
        emit TvlFeeUpdated(redeemFee, redeemFeeDenominator);
    }

    function setProfitFee(uint256 _fee, uint256 _feeDenominator) external onlyAdmin {
        require(_feeDenominator != 0, "Zero denominator not allowed");
        profitFee = _fee;
        profitFeeDenominator = _feeDenominator;
        emit ProfitFeeUpdated(redeemFee, redeemFeeDenominator);
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


    function buy(uint256 _amount) external whenNotPaused oncePerBlock returns (uint256) {
        uint256 currentBalance = usdPlus.balanceOf(msg.sender);
        require(currentBalance >= _amount, "Not enough tokens to buy");

        usdPlus.transferFrom(msg.sender, address(strategy), _amount);
        strategy.stake(_amount);

        uint256 buyFeeAmount = (_amount * buyFee) / buyFeeDenominator;
        uint256 buyAmount = _amount - buyFeeAmount;

        rebase.mint(msg.sender, buyAmount);

        emit EventExchange("buy", buyAmount, buyFeeAmount, msg.sender);

        return buyAmount;
    }


    function redeem(uint256 _amount) external whenNotPaused oncePerBlock returns (uint256) {

        uint256 redeemFeeAmount = (_amount * redeemFee) / redeemFeeDenominator;
        uint256 redeemAmount = _amount - redeemFeeAmount;

        uint256 unstakedAmount = strategy.unstake(redeemAmount, address(this));

        // Or just burn from sender
        rebase.burn(msg.sender, _amount);

        require(usdPlus.balanceOf(address(this)) >= unstakedAmount, "Not enough for transfer unstakedAmount");
        usdPlus.transfer(msg.sender, redeemAmount);

        emit EventExchange("redeem", redeemAmount, redeemFeeAmount, msg.sender);

        return redeemAmount;
    }

    function payout() public whenNotPaused {
        _payout();
    }

    function _payout() internal {
        if (block.timestamp + payoutTimeRange < nextPayoutTime) {
            return;
        }


        strategy.claimRewards(address(this));
        usdc.transfer(address(strategy), usdc.balanceOf(address(this)));

        uint256 totalRebaseSupplyRay = rebase.scaledTotalSupply();
        uint256 totalRebaseSupply = totalRebaseSupplyRay.rayToWad();
        uint256 totalUsdc = strategy.netAssetValue();


        uint256 fee;
        uint256 tvlFeeAmount;
        uint256 profitFeeAmount;
        uint256 profit;
        uint256 loss;

        if (totalUsdc > totalRebaseSupply) {
            profit = totalUsdc - totalRebaseSupply;

            tvlFeeAmount = (profit * tvlFee) / 365 / tvlFeeDenominator;
            profit = profit - tvlFeeAmount;

            profitFeeAmount = (profit * profitFee ) / profitFeeDenominator;
            profit = profit - profitFeeAmount;

            fee = tvlFeeAmount + profitFeeAmount;
        }else {
            loss = totalRebaseSupply - totalUsdc;
        }

        totalUsdc = totalUsdc - fee;

        uint256 totalUsdcSupplyRay = totalUsdc.wadToRay();
        // in ray
        uint256 newLiquidityIndex = totalUsdcSupplyRay.rayDiv(totalRebaseSupplyRay);
        rebase.setLiquidityIndex(newLiquidityIndex);


        if(fee > 0){
            require(collector != address(0), "Collector address zero");
            rebase.mint(collector, fee);
        }

        emit PayoutEvent(tvlFeeAmount, profitFeeAmount, profit, loss);

        // update next payout time. Cycle for preventing gaps
        for (; block.timestamp >= nextPayoutTime - payoutTimeRange;) {
            nextPayoutTime = nextPayoutTime + payoutPeriod;
        }
        emit NextPayoutTime(nextPayoutTime);
    }
}
