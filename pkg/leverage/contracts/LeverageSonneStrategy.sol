// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Reaper.sol";
import "@overnight-contracts/connectors/contracts/stuff/Sonne.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";

import "hardhat/console.sol";

contract LeverageSonneStrategy is Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    uint256 public constant DM_18 = 1e18;

    // --- params

    IERC20 public asset;
    IERC20 public leverage;

    uint256 public assetDm;
    uint256 public leverageDm;


    Unitroller public controller;
    CToken public cAsset;
    CToken public cLeverage;

    IPriceFeed public oracleAsset;
    IPriceFeed public oracleLeverage;


    /*
     * {targetLTV} - The target loan to value for the strategy where 1 ether = 100%
     * {allowedLTVDrift} - How much the strategy can deviate from the target ltv where 0.01 ether = 1%
     * {borrowDepth} - The maximum amount of loops used to leverage and deleverage
     * {minWantToLeverage} - The minimum amount of want to leverage in a loop
     */

    uint256 public targetLTV;
    uint256 public allowedLTVDrift;
    uint256 public borrowDepth;
    uint256 public minWantToLeverage;

    // --- structs

    struct StrategyParams {
        address asset;
        address leverage;
        address controller;
        address cAsset;
        address cLeverage;
        address oracleAsset;
        address oracleLeverage;
    }

    // --- events

    event StrategyUpdatedParams();

    function setParams(StrategyParams calldata params) external {
        asset = IERC20(params.asset);
        leverage = IERC20(params.leverage);
        controller = Unitroller(params.controller);
        cAsset = CToken(params.cAsset);
        cLeverage = CToken(params.cLeverage);

        assetDm = 10 ** IERC20Metadata(params.asset).decimals();
        leverageDm = 10 ** IERC20Metadata(params.leverage).decimals();

        oracleAsset = IPriceFeed(params.oracleAsset);
        oracleLeverage = IPriceFeed(params.oracleLeverage);

        address[] memory cTokens = new address[](2);
        cTokens[0] = address(params.cAsset);
        cTokens[1] = address(params.cLeverage);
        controller.enterMarkets(cTokens);

        emit StrategyUpdatedParams();
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        targetLTV = 873000000000000000;
        allowedLTVDrift = 10000000000000000;
        borrowDepth = 12;
        minWantToLeverage = 5;
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(DEFAULT_ADMIN_ROLE)
    override
    {}


    function depositTest() public {

        _deposit(asset, cAsset);

        uint256 supplied = _getSupplied();
        uint256 borrowed = _getBorrowed();

        console.log('Supplied %s', supplied);
        console.log('Borrowed %s', borrowed);

        uint256 canBorrow = (supplied * targetLTV) / DM_18;

        console.log('CanBorrow    %s', canBorrow);
        console.log('CanBorrow DM %s', _usdToLeverage(canBorrow));

        cLeverage.borrow(_usdToLeverage(canBorrow));

        console.log('Leverage %s', leverage.balanceOf(address(this)));
        leverage.approve(address(cLeverage), leverage.balanceOf(address(this)));
        cLeverage.mint(leverage.balanceOf(address(this)));

        supplied = _getSupplied();
        borrowed = _getBorrowed();

        console.log('Supplied %s', supplied);
        console.log('Borrowed %s', borrowed);

        console.log('NAV      %s', supplied - borrowed);
        console.log('LTV      %s', _calculateLTV());
        console.log('HF       %s', 1e30 / _calculateLTV());
    }

    // --- logic

    /**
     * @dev Function that puts the funds to work.
     * It gets called whenever someone supplied in the strategy's vault contract.
     * It supplies {want} Sonne to farm {SONNE}
     */
    function deposit() public {

        _deposit(asset, cAsset);

        uint256 _ltv = _calculateLTV();

        if (_shouldLeverage(_ltv)) {
            _leverMax();
        } else if (_shouldDeleverage(_ltv)) {
            _deleverage(0);
        }

        console.log('Finish');
        console.log('LTV           %s', _calculateLTV());
        console.log('HF            %s', 1e30 / _calculateLTV());
        console.log('NAV           %s', netAssetValue());

    }



    /**
     * @dev Return NAV in USD
     *
     **/

    function netAssetValue() public view returns (uint256){

        uint256 supplied = _getSupplied();
        uint256 borrowed = _getBorrowed();

        return supplied - borrowed;
    }

    function _deposit(IERC20 _token, CToken _cToken) internal {
        uint256 balance = _token.balanceOf(address(this));
        console.log('Deposit: %s', balance);
        if (balance > 0) {
            _token.approve(address(_cToken), balance);
            _cToken.mint(balance);
        }
    }

    /**
 * @dev Returns if the strategy should leverage with the given ltv level
     */
    function _shouldLeverage(uint256 _ltv) internal view returns (bool) {
        if (targetLTV >= allowedLTVDrift && _ltv < targetLTV - allowedLTVDrift) {
            return true;
        }
        return false;
    }

    /**
 * @dev Returns if the strategy should deleverage with the given ltv level
     */
    function _shouldDeleverage(uint256 _ltv) internal view returns (bool) {
        if (_ltv > targetLTV + allowedLTVDrift) {
            return true;
        }
        return false;
    }


    /**
 * @dev This is the state changing calculation of LTV that is more accurate
     * to be used internally.
     */
    function _calculateLTV() internal returns (uint256 ltv) {
        uint256 supplied = _getSupplied();
        uint256 borrowed = _getBorrowed();

        if (supplied == 0 || borrowed == 0) {
            return 0;
        }
        ltv = (DM_18 * borrowed) / supplied;
    }

    /**
      * @dev Total borrowed = borrow of leverage token
      * Return amount in USD
      */

    function _getBorrowed() internal view returns (uint256 balance){
        balance = cLeverage.borrowBalanceStored(address(this)); // 1e18
        balance = _leverageToUsd(balance);
    }

    /**
      * @dev Total supplied = asset+leverage
      * Return amount in USD
      */

    function _getSupplied() internal view returns (uint256 balance){

        uint256 cLeverageBalance = cLeverage.balanceOf(address(this)) * cLeverage.exchangeRateStored() / DM_18; // 1e18
        uint256 cAssetBalance = cAsset.balanceOf(address(this)) * cAsset.exchangeRateStored() / DM_18; // 1e6

        balance += _leverageToUsd(cLeverageBalance);
        balance += _assetToUsd(cAssetBalance);
    }

    /**
 * @dev Levers the strategy up to the targetLTV
     */
    function _leverMax() internal {
        uint256 supplied = _getSupplied();
        uint256 borrowed = _getBorrowed();

        uint256 realSupply = supplied - borrowed;
        uint256 newBorrow = _getMaxBorrowFromSupplied(realSupply, targetLTV);
        uint256 totalAmountToBorrow = newBorrow - borrowed;

        for (uint8 i = 0; i < borrowDepth && totalAmountToBorrow > minWantToLeverage; i++) {
            totalAmountToBorrow = totalAmountToBorrow - _leverUpStep(totalAmountToBorrow);
        }
    }

    /**
 * @dev Gets the maximum amount allowed to be borrowed for a given collateral factor and amount supplied
     */
    function _getMaxBorrowFromSupplied(uint256 wantSupplied, uint256 collateralFactor) internal pure returns (uint256) {
        return ((wantSupplied * collateralFactor) / (DM_18 - collateralFactor));
    }


    /**
     * @dev For a given withdraw amount, deleverages to a borrow level
     * that will maintain the target LTV
     */
    function _deleverage(uint256 _withdrawAmount) internal {
        //        uint256 newBorrow = _getDesiredBorrow(_withdrawAmount);
        //
        //        // //If there is no deficit we dont need to adjust position
        //        // //if the position change is tiny do nothing
        //        if (newBorrow > minWantToLeverage) {
        //            uint256 i = 0;
        //            while (newBorrow > minWantToLeverage) {
        //                newBorrow = newBorrow - _leverDownStep(newBorrow);
        //                i++;
        //                //A limit set so we don't run out of gas
        //                if (i >= borrowDepth) {
        //                    break;
        //                }
        //            }
        //        }
    }

    /**
  * @dev For a given withdraw amount, figures out the new borrow with the current supply
     * that will maintain the target LTV
     */
    function _getDesiredBorrow(uint256 _withdrawAmount) internal returns (uint256 position) {
        //        //we want to use statechanging for safety
        //        uint256 supplied = cLeverage.balanceOfUnderlying(address(this));
        //        uint256 borrowed = cLeverage.borrowBalanceStored(address(this));
        //
        //        //When we unwind we end up with the difference between borrow and supply
        //        uint256 unwoundSupplied = supplied - borrowed;
        //
        //        //we want to see how close to collateral target we are.
        //        //So we take our unwound supplied and add or remove the _withdrawAmount we are are adding/removing.
        //        //This gives us our desired future undwoundDeposit (desired supply)
        //
        //        uint256 desiredSupply = 0;
        //        if (_withdrawAmount > unwoundSupplied) {
        //            _withdrawAmount = unwoundSupplied;
        //        }
        //        desiredSupply = unwoundSupplied - _withdrawAmount;
        //
        //        //(ds *c)/(1-c)
        //        uint256 num = desiredSupply * targetLTV;
        //        uint256 den = MANTISSA - targetLTV;
        //
        //        uint256 desiredBorrow = num / den;
        //        if (desiredBorrow > 1e5) {
        //            //stop us going right up to the wire
        //            desiredBorrow = desiredBorrow - 1e5;
        //        }
        //
        //        position = borrowed - desiredBorrow;
    }


    /**
     * @dev Does one step of leveraging
     * _withdrawAmount - in USD
     */
    function _leverUpStep(uint256 _withdrawAmount) internal returns (uint256) {
        if (_withdrawAmount == 0) {
            return 0;
        }

        uint256 supplied = _getSupplied();
        uint256 borrowed = _getBorrowed();

        uint256 canBorrow = (supplied * targetLTV) / DM_18;

        console.log('CanBorrow %s', canBorrow);
        console.log('borrowed  %s', borrowed);
        canBorrow -= borrowed;

        if (canBorrow < _withdrawAmount) {
            _withdrawAmount = canBorrow;
        }


        if (_withdrawAmount > 10) {

            // borrow available amount
            cLeverage.borrow(_usdToLeverage(_withdrawAmount));

            // deposit available want as collateral
            _deposit(leverage, cLeverage);

            console.log('borrow     %s', _withdrawAmount);
            console.log('LTV        %s', _calculateLTV());
            console.log('HF         %s', 1e30 / _calculateLTV());
            console.log('---------');

        }

        return _withdrawAmount;
    }

    /**
 * @dev Withdraws funds and sents them back to the vault.
     * It withdraws {want} from Sonne
     * The available {want} minus fees is returned to the vault.
     */
    function _withdraw(uint256 _withdrawAmount) internal {
        //        uint256 wantBalance = IERC20Upgradeable(want).balanceOf(address(this));
        //
        //        if (_withdrawAmount <= wantBalance) {
        //            IERC20Upgradeable(want).safeTransfer(vault, _withdrawAmount);
        //            return;
        //        }
        //
        //        uint256 _ltv = _calculateLTVAfterWithdraw(_withdrawAmount);
        //
        //        if (_shouldLeverage(_ltv)) {
        //            // Strategy is underleveraged so can withdraw underlying directly
        //            _withdrawUnderlyingToVault(_withdrawAmount);
        //            _leverMax();
        //        } else if (_shouldDeleverage(_ltv)) {
        //            _deleverage(_withdrawAmount);
        //
        //            // Strategy has deleveraged to the point where it can withdraw underlying
        //            _withdrawUnderlyingToVault(_withdrawAmount);
        //        } else {
        //            // LTV is in the acceptable range so the underlying can be withdrawn directly
        //            _withdrawUnderlyingToVault(_withdrawAmount);
        //        }
    }

    /**
      * @dev Withdraws want to the vault by redeeming the underlying
      */
    function _withdrawUnderlyingToVault(uint256 _withdrawAmount) internal {
        //        _withdrawUnderlying(_withdrawAmount);
        //        uint256 bal = lusd.balanceOf(address(this));
        //        uint256 finalWithdrawAmount = bal < _withdrawAmount ? bal : _withdrawAmount;
        //        IERC20Upgradeable(want).safeTransfer(vault, finalWithdrawAmount);
    }

    /**
    * @dev Withdraws want to the strat by redeeming the underlying
     */
    function _withdrawUnderlying(uint256 _withdrawAmount) internal {
        //        uint256 initialWithdrawAmount = _withdrawAmount;
        //        uint256 supplied = sLusd.balanceOfUnderlying(address(this));
        //        uint256 borrowed = sLusd.borrowBalanceStored(address(this));
        //        uint256 realSupplied = supplied - borrowed;
        //
        //        if (realSupplied == 0) {
        //            return;
        //        }
        //
        //        if (_withdrawAmount > realSupplied) {
        //            _withdrawAmount = realSupplied;
        //        }
        //
        //        uint256 tempColla = targetLTV + allowedLTVDrift;
        //
        //        uint256 reservedAmount = 0;
        //
        //
        //        reservedAmount = (borrowed * DM_18) / tempColla;
        //        if (supplied >= reservedAmount) {
        //            uint256 redeemable = supplied - reservedAmount;
        //            uint256 balance = sLusd.balanceOf(address(this));
        //            if (balance > 1) {
        //                if (redeemable < _withdrawAmount) {
        //                    _withdrawAmount = redeemable;
        //                }
        //            }
        //        }
        //
        //        uint256 withdrawAmount = _withdrawAmount - 1;
        //        if (withdrawAmount < initialWithdrawAmount) {
        ////            require(
        ////                withdrawAmount >=
        ////                (initialWithdrawAmount * (PERCENT_DIVISOR - withdrawSlippageTolerance)) / PERCENT_DIVISOR
        ////            );
        //        }
        //
        //        sLusd.redeemUnderlying(withdrawAmount);
    }


    /**
      * @dev Calculates what the LTV will be after withdrawing
      */
    function _calculateLTVAfterWithdraw(uint256 _withdrawAmount) internal returns (uint256 ltv) {
        //        uint256 supplied = sLusd.balanceOfUnderlying(address(this));
        //        uint256 borrowed = sLusd.borrowBalanceStored(address(this));
        //        supplied = supplied - _withdrawAmount;
        //
        //        if (supplied == 0 || borrowed == 0) {
        //            return 0;
        //        }
        //        ltv = (DM_18 * borrowed) / supplied;
    }


    function _usdToLeverage(uint256 amount) internal view returns (uint256) {
        return ChainlinkLibrary.convertUsdToToken(amount, leverageDm, uint256(oracleLeverage.latestAnswer()));
    }

    function _usdToAsset(uint256 amount) internal view returns (uint256) {
        return ChainlinkLibrary.convertUsdToToken(amount, assetDm, uint256(oracleAsset.latestAnswer()));
    }

    function _leverageToUsd(uint256 amount) internal view returns (uint256) {
        return ChainlinkLibrary.convertTokenToUsd(amount, leverageDm, uint256(oracleLeverage.latestAnswer()));
    }

    function _assetToUsd(uint256 amount) internal view returns (uint256) {
        return ChainlinkLibrary.convertTokenToUsd(amount, assetDm, uint256(oracleAsset.latestAnswer()));
    }


}
