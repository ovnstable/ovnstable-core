// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IERC20MintableBurnable.sol";
import "./interfaces/IConnector.sol";
import "./OvernightToken.sol";
import "./interfaces/IPortfolioManager.sol";
import "./PortfolioManager.sol";
import "./interfaces/IMark2Market.sol";

contract Exchange is AccessControl {
    OvernightToken public ovn;
    IERC20 public usdc;
    PortfolioManager public pm; //portfolio manager contract
    IMark2Market public m2m;

    uint256 public buyFee = 40;
    uint256 public buyFeeDenominator = 100000; // ~ 100 %

    uint256 public redeemFee = 40;
    uint256 public redeemFeeDenominator = 100000; // ~ 100 %

    // next payout time in epoch seconds
    uint256 public nextPayoutTime = 1637193600; // 1637193600 = 2021-11-18T00:00:00Z

    // period between payouts in seconds, need to calc nextPayoutTime
    uint256 public payoutPeriod = 24 * 60 * 60;

    // range of time for starting near next payout time at seconds
    // if time in [nextPayoutTime-payoutTimeRange;nextPayoutTime+payoutTimeRange]
    //    then payouts can be started by payout() method anyone
    // else if time more than nextPayoutTime+payoutTimeRange
    //    then payouts started by any next buy/redeem
    uint256 public payoutTimeRange = 15 * 60;

    event EventExchange(string label, uint256 amount, uint256 fee, address sender);
    event PayoutEvent(
        uint256 totalOvn,
        uint256 totalUsdc,
        uint256 totallyAmountPaid,
        uint256 totallySaved
    );
    event NoEnoughForPayoutEvent(uint256 totalOvn, uint256 totalUsdc);
    event UpdatedBuyFee(uint256 fee, uint256 feeDenominator);
    event UpdatedRedeemFee(uint256 fee, uint256 feeDenominator);
    event PaidBuyFee(uint256 amount, uint256 feeAmount);
    event PaidRedeemFee(uint256 amount, uint256 feeAmount);
    event UpdatedPayoutTimes(uint256 nextPayoutTime, uint256 payoutPeriod, uint256 payoutTimeRange);
    event NextPayoutTime(uint256 nextPayoutTime);
    event ErrorLogging(string reason);

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setTokens(address _ovn, address _usdc) external onlyAdmin {
        require(_ovn != address(0), "Zero address not allowed");
        require(_usdc != address(0), "Zero address not allowed");
        ovn = OvernightToken(_ovn);
        usdc = IERC20(_usdc);
    }

    function setAddr(address _addrPM, address _addrM2M) external onlyAdmin {
        require(_addrPM != address(0), "Zero address not allowed");
        require(_addrM2M != address(0), "Zero address not allowed");
        pm = PortfolioManager(_addrPM);
        m2m = IMark2Market(_addrM2M);
    }

    function setBuyFee(uint256 _fee, uint256 _feeDenominator) external onlyAdmin {
        require(_feeDenominator != 0, "Zero denominator not allowed");
        buyFee = _fee;
        buyFeeDenominator = _feeDenominator;
        emit UpdatedBuyFee(buyFee, buyFeeDenominator);
    }

    function setRedeemFee(uint256 _fee, uint256 _feeDenominator) external onlyAdmin {
        require(_feeDenominator != 0, "Zero denominator not allowed");
        redeemFee = _fee;
        redeemFeeDenominator = _feeDenominator;
        emit UpdatedBuyFee(redeemFee, redeemFeeDenominator);
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
        emit UpdatedPayoutTimes(nextPayoutTime, payoutPeriod, payoutTimeRange);
    }

    function balance() public view returns (uint256) {
        return ovn.balanceOf(msg.sender);
    }

    function buy(address _addrTok, uint256 _amount) external {
        require(_addrTok == address(usdc), "Only USDC tokens currently available for buy");

        uint256 balance = IERC20(_addrTok).balanceOf(msg.sender);
        require(balance >= _amount, "Not enough tokens to buy");

        IERC20(_addrTok).transferFrom(msg.sender, address(this), _amount);

        uint256 buyFeeAmount = (_amount * buyFee) / buyFeeDenominator;
        uint256 buyAmount = _amount - buyFeeAmount;
        emit PaidBuyFee(buyAmount, buyFeeAmount);

        emit EventExchange("buy", buyAmount, buyFeeAmount, msg.sender);

        ovn.mint(msg.sender, buyAmount);

        IERC20(_addrTok).transfer(address(pm), _amount);
        pm.deposit(IERC20(_addrTok), _amount);

        // prevent stucked payout caller
        if (block.timestamp > nextPayoutTime + payoutTimeRange) {
            _payout();
        }
    }

    function redeem(address _addrTok, uint256 _amount) external {
        require(_addrTok == address(usdc), "Only USDC tokens currently available for redeem");

        uint256 redeemFeeAmount = (_amount * redeemFee) / redeemFeeDenominator;
        uint256 redeemAmount = _amount - redeemFeeAmount;
        emit PaidRedeemFee(redeemAmount, redeemFeeAmount);

        emit EventExchange("redeem", redeemAmount, redeemFeeAmount, msg.sender);

        //TODO: Real unstacked amount may be different to _amount
        uint256 unstakedAmount = pm.withdraw(IERC20(_addrTok), redeemAmount);

        // Or just burn from sender
        ovn.burn(msg.sender, _amount);

        // TODO: correct amount by rates or oracles
        // TODO: check threshhold limits to withdraw deposite
        require(
            IERC20(_addrTok).balanceOf(address(this)) >= unstakedAmount,
            "Not enough for transfer unstakedAmount"
        );
        IERC20(_addrTok).transfer(msg.sender, unstakedAmount);

        // prevent stucked payout caller
        if (block.timestamp > nextPayoutTime + payoutTimeRange) {
            _payout();
        }
    }

    //TODO: remove after moving to payout() usage
    function reward() external onlyAdmin {
        _payout();
    }

    function payout() public onlyAdmin {
        _payout();
    }

    function _payout() internal {
        if (block.timestamp + payoutTimeRange < nextPayoutTime) {
            return;
        }

        // 0. call claiming reward and rebalancing on PM TODO: may be need move to another place
        // 1. get current amount of OVN
        // 2. get total sum of USDC we can get from any source
        // 3. calc difference between total count of OVN and USDC
        // 4. go through all OVN owners and mint to their addresses proportionally OVN

        pm.claimRewards();
        pm.balanceOnReward();

        uint256 totalOvnSupply = ovn.totalSupply();
        IMark2Market.TotalAssetPrices memory assetPrices = m2m.assetPricesForBalance();
        uint256 totalUsdc = assetPrices.totalUsdcPrice;
        // denormilize from 10**18 to 10**6 as OVN decimals
        totalUsdc = totalUsdc / 10**12;
        if (totalUsdc <= totalOvnSupply) {
            emit NoEnoughForPayoutEvent(totalOvnSupply, totalUsdc);
            return;
        }
        uint difference = totalUsdc - totalOvnSupply;

        uint totallyAmountPaid = 0;
        for (uint8 i = 0; i < ovn.ownerLength(); i++) {
            address ovnOwnerAddress = ovn.ownerAt(i);
            uint ovnBalance = ovn.balanceOf(ovnOwnerAddress);
            uint additionalMintAmount = (ovnBalance * difference) / totalOvnSupply;
            if (additionalMintAmount > 0) {
                ovn.mint(ovnOwnerAddress, additionalMintAmount);
                totallyAmountPaid += additionalMintAmount;
            }
        }
        //TODO: what to do with saved usdc? Do we need to mint it to PM

        emit PayoutEvent(
            totalOvnSupply,
            totalUsdc,
            totallyAmountPaid,
            difference - totallyAmountPaid
        );

        // update next payout time. Cycle for preventing gaps
        for (; block.timestamp >= nextPayoutTime - payoutTimeRange; ) {
            nextPayoutTime = nextPayoutTime + payoutPeriod;
        }
        emit NextPayoutTime(nextPayoutTime);
    }
}
