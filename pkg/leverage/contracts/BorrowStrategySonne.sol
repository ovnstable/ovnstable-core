// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Sonne.sol";
import "@overnight-contracts/connectors/contracts/stuff/Velodrome.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";


/**
 * @dev This strategy will deposit and leverage a token on Sonne to maximize yield by farming reward tokens
 */

contract BorrowStrategySonne is Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    bytes32 public constant UNIT_ROLE = keccak256("UNIT_ROLE");
    bytes32 public constant PORTFOLIO_AGENT_ROLE = keccak256("PORTFOLIO_AGENT_ROLE");


    IERC20 public asset;
    CToken public cAsset;
    IERC20 public sonne;

    IRouter public veloRouter;
    Unitroller public controller;

    address public strategy;

    /**
     * @dev Sonne variables
     * {markets} - Contains the Sonne tokens to farm, used to enter markets and claim Sonne
     * {MANTISSA} - The unit used by the Compound protocol
     * {LTV_SAFETY_ZONE} - We will only go up to 98% of max allowed LTV for {targetLTV}
     */

    address[] public markets;
    uint256 public constant MANTISSA = 1e18;
    uint256 public constant LTV_SAFETY_ZONE = 0.98 ether;
    uint256 public constant PERCENT_DIVISOR = 10000;

    /**
     * @dev Strategy variables
     * {targetLTV} - The target loan to value for the strategy where 1 ether = 100%
     * {allowedLTVDrift} - How much the strategy can deviate from the target ltv where 0.01 ether = 1%
     * {balanceOfPool} - The total balance deposited into Sonne (supplied - borrowed)
     * {borrowDepth} - The maximum amount of loops used to leverage and deleverage
     * {minWantToLeverage} - The minimum amount of asset to leverage in a loop
     * {withdrawSlippageTolerance} - Maximum slippage authorized when withdrawing
     */

    uint256 public targetLTV;
    uint256 public allowedLTVDrift;
    uint256 public balanceOfPool;
    uint256 public borrowDepth;
    uint256 public minWantToLeverage;
    uint256 public maxBorrowDepth;
    uint256 public withdrawSlippageTolerance;

    // --- structs

    struct StrategyParams {
        address asset;
        address sonne;
        address cAsset;
        address veloRouter;
        uint256 targetLTV;
    }

    // --- events

    event StrategyUpdatedParams();

    function setParams(StrategyParams calldata params) external onlyAdmin {
        asset = IERC20(params.asset);
        sonne = IERC20(params.sonne);
        cAsset = CToken(params.cAsset);

        veloRouter = IRouter(params.veloRouter);
        controller = Unitroller(cAsset.controller());

        address[] memory cTokens = new address[](1);
        cTokens[0] = address(params.cLeverage);
        controller.enterMarkets(cTokens);

        setTargetLtv(params.targetLTV);

        emit StrategyUpdatedParams();
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        allowedLTVDrift = 0.01 ether;
        balanceOfPool = 0;
        borrowDepth = 12;
        minWantToLeverage = 5;
        maxBorrowDepth = 15;
        withdrawSlippageTolerance = 50;
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyStrategy() {
        require(strategy == msg.sender, "!strategy");
        _;
    }

    modifier onlyPortfolioAgent() {
        require(hasRole(PORTFOLIO_AGENT_ROLE, msg.sender), "!Portfolio Agent");
        _;
    }

    modifier onlyUnit(){
        require(hasRole(UNIT_ROLE, msg.sender), "!Unit");
        _;
    }


    /**
     * @dev Function that puts the funds to work.
     * It gets called whenever someone supplied in the strategy's vault contract.
     * It supplies {asset} Sonne to farm {SONNE}
     */
    function deposit() public doUpdateBalance onlyStrategy {
        uint256 assetBalance = balanceOfAsset();

        asset.approve(address(cAsset), assetBalance);
        cAsset.mint(assetBalance);
        uint256 _ltv = _calculateLTV();

        if (_shouldLeverage(_ltv)) {
            _leverMax();
        } else if (_shouldDeleverage(_ltv)) {
            _deleverage(0);
        }
    }

    /**
     * @dev Withdraws funds and sents them back to the vault.
     * It withdraws {asset} from Sonne
     * The available {asset} minus fees is returned to the vault.
     */

    function withdraw(uint256 _withdrawAmount) public doUpdateBalance onlyStrategy {
        uint256 assetBalance = asset.balanceOf(address(this));

        if (_withdrawAmount <= assetBalance) {
            asset.transfer(strategy, _withdrawAmount);
            return;
        }

        uint256 _ltv = _calculateLTVAfterWithdraw(_withdrawAmount);

        if (_shouldLeverage(_ltv)) {
            // Strategy is underleveraged so can withdraw underlying directly
            _withdrawUnderlyingToVault(_withdrawAmount);
            _leverMax();
        } else if (_shouldDeleverage(_ltv)) {
            _deleverage(_withdrawAmount);

            // Strategy has deleveraged to the point where it can withdraw underlying
            _withdrawUnderlyingToVault(_withdrawAmount);
        } else {
            // LTV is in the acceptable range so the underlying can be withdrawn directly
            _withdrawUnderlyingToVault(_withdrawAmount);
        }
    }

    /**
     * @dev Calculates the LTV using existing exchange rate,
     * depends on the cAsset being updated to be accurate.
     * Does not update in order provide a view function for LTV.
     */
    function calculateLTV() external view returns (uint256 ltv) {
        (, uint256 cWantBalance, uint256 borrowed, uint256 exchangeRate) = cAsset.getAccountSnapshot(address(this));

        uint256 supplied = (cWantBalance * exchangeRate) / MANTISSA;

        if (supplied == 0 || borrowed == 0) {
            return 0;
        }

        ltv = (MANTISSA * borrowed) / supplied;
    }

    /**
     * @dev Emergency function to deleverage in case regular deleveraging breaks
     */
    function manualDeleverage(uint256 amount) external doUpdateBalance onlyPortfolioAgent {
        require(cAsset.redeemUnderlying(amount) == 0);
        require(cAsset.repayBorrow(amount) == 0);
    }

    /**
     * @dev Emergency function to deleverage in case regular deleveraging breaks
     */
    function manualReleaseWant(uint256 amount) external doUpdateBalance onlyPortfolioAgent {
        require(cAsset.redeemUnderlying(amount) == 0);
    }

    /**
     * @dev Sets a new LTV for leveraging.
     * Should be in units of 1e18
     */
    function setTargetLtv(uint256 _ltv) public onlyPortfolioAgent {

        (, uint256 collateralFactorMantissa,) = controller.markets(address(cAsset));
        require(collateralFactorMantissa > _ltv + allowedLTVDrift);
        require(_ltv <= (collateralFactorMantissa * LTV_SAFETY_ZONE) / MANTISSA);
        targetLTV = _ltv;
    }

    /**
     * @dev Sets a new allowed LTV drift
     * Should be in units of 1e18
     */
    function setAllowedLtvDrift(uint256 _drift) external onlyPortfolioAgent {

        (, uint256 collateralFactorMantissa,) = controller.markets(address(cAsset));
        require(collateralFactorMantissa > targetLTV + _drift);
        allowedLTVDrift = _drift;
    }

    /**
     * @dev Sets a new borrow depth (how many loops for leveraging+deleveraging)
     */
    function setBorrowDepth(uint8 _borrowDepth) external onlyPortfolioAgent {
        require(_borrowDepth <= maxBorrowDepth);
        borrowDepth = _borrowDepth;
    }

    /**
     * @dev Sets the minimum asset to leverage/deleverage (loop) for
     */
    function setMinWantToLeverage(uint256 _minWantToLeverage) external onlyPortfolioAgent {
        minWantToLeverage = _minWantToLeverage;
    }

    /**
     * @dev Sets the maximum slippage authorized when withdrawing
     */
    function setWithdrawSlippageTolerance(uint256 _withdrawSlippageTolerance) external onlyPortfolioAgent {
        withdrawSlippageTolerance = _withdrawSlippageTolerance;
    }



    /**
     * @dev Calculates the total amount of {asset} held by the strategy
     * which is the balance of asset + the total amount supplied to Sonne.
     */
    function balanceOf() public view returns (uint256) {
        return balanceOfAsset() + balanceOfPool;
    }

    /**
     * @dev Calculates the balance of asset held directly by the strategy
     */
    function balanceOfAsset() public view returns (uint256) {
        return asset.balanceOf(address(this));
    }

    /**
     * @dev Returns the current position in Sonne. Does not accrue interest
     * so might not be accurate, but the cAsset is usually updated.
     */
    function getCurrentPosition() public view returns (uint256 supplied, uint256 borrowed) {
        (, uint256 cWantBalance, uint256 borrowBalance, uint256 exchangeRate) = cAsset.getAccountSnapshot(address(this));
        borrowed = borrowBalance;

        supplied = (cWantBalance * exchangeRate) / MANTISSA;
    }

    /**
     * @dev Updates the balance. This is the state changing version so it sets
     * balanceOfPool to the latest value.
     */
    function updateBalance() public {
        uint256 supplyBalance = cAsset.balanceOfUnderlying(address(this));
        uint256 borrowBalance = cAsset.borrowBalanceCurrent(address(this));
        balanceOfPool = supplyBalance - borrowBalance;
    }

    /**
     * @dev Levers the strategy up to the targetLTV
     */
    function _leverMax() internal {
        uint256 supplied = cAsset.balanceOfUnderlying(address(this));
        uint256 borrowed = cAsset.borrowBalanceStored(address(this));

        uint256 realSupply = supplied - borrowed;
        uint256 newBorrow = _getMaxBorrowFromSupplied(realSupply, targetLTV);
        uint256 totalAmountToBorrow = newBorrow - borrowed;

        for (uint8 i = 0; i < borrowDepth && totalAmountToBorrow > minWantToLeverage; i++) {
            totalAmountToBorrow = totalAmountToBorrow - _leverUpStep(totalAmountToBorrow);
        }
    }

    /**
     * @dev Does one step of leveraging
     */
    function _leverUpStep(uint256 _withdrawAmount) internal returns (uint256) {
        if (_withdrawAmount == 0) {
            return 0;
        }

        uint256 supplied = cAsset.balanceOfUnderlying(address(this));
        uint256 borrowed = cAsset.borrowBalanceStored(address(this));
        (, uint256 collateralFactorMantissa,) = controller.markets(address(cAsset));
        uint256 canBorrow = (supplied * collateralFactorMantissa) / MANTISSA;

        canBorrow -= borrowed;

        if (canBorrow < _withdrawAmount) {
            _withdrawAmount = canBorrow;
        }

        if (_withdrawAmount > 10) {
            // borrow available amount
            cAsset.borrow(_withdrawAmount);

            // deposit available asset as collateral
            uint256 assetBalance = balanceOfAsset();
            asset.approve(address(cAsset), assetBalance);
            cAsset.mint(assetBalance);
        }

        return _withdrawAmount;
    }

    /**
     * @dev Gets the maximum amount allowed to be borrowed for a given collateral factor and amount supplied
     */
    function _getMaxBorrowFromSupplied(uint256 assetSupplied, uint256 collateralFactor) internal pure returns (uint256) {
        return ((assetSupplied * collateralFactor) / (MANTISSA - collateralFactor));
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
        uint256 supplied = cAsset.balanceOfUnderlying(address(this));
        uint256 borrowed = cAsset.borrowBalanceStored(address(this));

        if (supplied == 0 || borrowed == 0) {
            return 0;
        }
        ltv = (MANTISSA * borrowed) / supplied;
    }

    /**
     * @dev Calculates what the LTV will be after withdrawing
     */
    function _calculateLTVAfterWithdraw(uint256 _withdrawAmount) internal returns (uint256 ltv) {
        uint256 supplied = cAsset.balanceOfUnderlying(address(this));
        uint256 borrowed = cAsset.borrowBalanceStored(address(this));
        supplied = supplied - _withdrawAmount;

        if (supplied == 0 || borrowed == 0) {
            return 0;
        }
        ltv = (uint256(1e18) * borrowed) / supplied;
    }

    /**
     * @dev Withdraws asset to the strat by redeeming the underlying
     */
    function _withdrawUnderlying(uint256 _withdrawAmount) internal {
        uint256 initialWithdrawAmount = _withdrawAmount;
        uint256 supplied = cAsset.balanceOfUnderlying(address(this));
        uint256 borrowed = cAsset.borrowBalanceStored(address(this));
        uint256 realSupplied = supplied - borrowed;

        if (realSupplied == 0) {
            return;
        }

        if (_withdrawAmount > realSupplied) {
            _withdrawAmount = realSupplied;
        }

        uint256 tempColla = targetLTV + allowedLTVDrift;

        uint256 reservedAmount = 0;
        if (tempColla == 0) {
            tempColla = 1e15;
            // 0.001 * 1e18. lower we have issues
        }

        reservedAmount = (borrowed * MANTISSA) / tempColla;
        if (supplied >= reservedAmount) {
            uint256 redeemable = supplied - reservedAmount;
            uint256 balance = cAsset.balanceOf(address(this));
            if (balance > 1) {
                if (redeemable < _withdrawAmount) {
                    _withdrawAmount = redeemable;
                }
            }
        }

        uint256 withdrawAmount = _withdrawAmount - 1;
        if (withdrawAmount < initialWithdrawAmount) {
            require(
                withdrawAmount >=
                (initialWithdrawAmount * (PERCENT_DIVISOR - withdrawSlippageTolerance)) / PERCENT_DIVISOR
            );
        }

        cAsset.redeemUnderlying(withdrawAmount);
    }

    /**
     * @dev Withdraws asset to the vault by redeeming the underlying
     */
    function _withdrawUnderlyingToVault(uint256 _withdrawAmount) internal {
        _withdrawUnderlying(_withdrawAmount);
        uint256 bal = asset.balanceOf(address(this));
        uint256 finalWithdrawAmount = bal < _withdrawAmount ? bal : _withdrawAmount;
        asset.transfer(strategy, finalWithdrawAmount);
    }

    /**
     * @dev For a given withdraw amount, figures out the new borrow with the current supply
     * that will maintain the target LTV
     */
    function _getDesiredBorrow(uint256 _withdrawAmount) internal returns (uint256 position) {
        //we asset to use statechanging for safety
        uint256 supplied = cAsset.balanceOfUnderlying(address(this));
        uint256 borrowed = cAsset.borrowBalanceStored(address(this));

        //When we unwind we end up with the difference between borrow and supply
        uint256 unwoundSupplied = supplied - borrowed;

        //we asset to see how close to collateral target we are.
        //So we take our unwound supplied and add or remove the _withdrawAmount we are are adding/removing.
        //This gives us our desired future undwoundDeposit (desired supply)

        uint256 desiredSupply = 0;
        if (_withdrawAmount > unwoundSupplied) {
            _withdrawAmount = unwoundSupplied;
        }
        desiredSupply = unwoundSupplied - _withdrawAmount;

        //(ds *c)/(1-c)
        uint256 num = desiredSupply * targetLTV;
        uint256 den = MANTISSA - targetLTV;

        uint256 desiredBorrow = num / den;
        if (desiredBorrow > 1e5) {
            //stop us going right up to the wire
            desiredBorrow = desiredBorrow - 1e5;
        }

        position = borrowed - desiredBorrow;
    }

    /**
     * @dev For a given withdraw amount, deleverages to a borrow level
     * that will maintain the target LTV
     */
    function _deleverage(uint256 _withdrawAmount) internal {
        uint256 newBorrow = _getDesiredBorrow(_withdrawAmount);

        // //If there is no deficit we dont need to adjust position
        // //if the position change is tiny do nothing
        if (newBorrow > minWantToLeverage) {
            uint256 i = 0;
            while (newBorrow > minWantToLeverage) {
                newBorrow = newBorrow - _leverDownStep(newBorrow);
                i++;
                //A limit set so we don't run out of gas
                if (i >= borrowDepth) {
                    break;
                }
            }
        }
    }

    /**
     * @dev Deleverages one step
     */
    function _leverDownStep(uint256 maxDeleverage) internal returns (uint256 deleveragedAmount) {
        uint256 minAllowedSupply = 0;
        uint256 supplied = cAsset.balanceOfUnderlying(address(this));
        uint256 borrowed = cAsset.borrowBalanceStored(address(this));
        (, uint256 collateralFactorMantissa,) = controller.markets(address(cAsset));

        //collat ration should never be 0. if it is something is very wrong... but just incase
        if (collateralFactorMantissa != 0) {
            minAllowedSupply = (borrowed * MANTISSA) / collateralFactorMantissa;
        }
        uint256 maxAllowedDeleverageAmount = supplied - minAllowedSupply;

        deleveragedAmount = maxAllowedDeleverageAmount;

        if (deleveragedAmount >= borrowed) {
            deleveragedAmount = borrowed;
        }
        if (deleveragedAmount >= maxDeleverage) {
            deleveragedAmount = maxDeleverage;
        }
        uint256 exchangeRateStored = cAsset.exchangeRateStored();
        //redeemTokens = redeemAmountIn * 1e18 / exchangeRate. must be more than 0
        //a rounding error means we need another small addition
        if (deleveragedAmount * MANTISSA >= exchangeRateStored && deleveragedAmount > 10) {
            deleveragedAmount -= 10;
            // Amount can be slightly off for tokens with less decimals (USDC), so redeem a bit less
            cAsset.redeemUnderlying(deleveragedAmount);
            //our borrow has been increased by no more than maxDeleverage
            asset.approve(address(cAsset), deleveragedAmount);
            cAsset.repayBorrow(deleveragedAmount);
        }
    }

    /**
     * @dev Core function of the strat, in charge of collecting and re-investing rewards.
     * @notice Assumes the deposit will take care of the TVL rebalancing.
     * 1. Claims {SONNE} from the controller.
     * 2. Swaps {SONNE} to {USDC}.
     * 3. Deposits.
     */
    function harvest() external onlyStrategy {
        _claimRewards();
        deposit();
    }

    /**
     * @dev Core harvest function.
     * Get rewards from markets entered
     */
    function _claimRewards() internal {
        CToken[] memory tokens = new CToken[](1);
        tokens[0] = cAsset;

        controller.claimComp(address(this), tokens);

        uint256 sonneBalance = sonne.balanceOf(address(this));

        if (sonneBalance > 0) {
            uint256 amountOut = VelodromeLibrary.getAmountsOut(
                veloRouter,
                address(sonne),
                address(asset),
                false,
                sonneBalance
            );

            if (amountOut > 0) {
                VelodromeLibrary.singleSwap(
                    veloRouter,
                    address(sonne),
                    address(asset),
                    false,
                    sonneBalance,
                    amountOut * 99 / 100,
                    address(this)
                );
            }
        }

    }



    /**
     * @dev Withdraws all funds leaving rewards behind.
     */
    function reclaimAsset() public doUpdateBalance onlyStrategy {
        _claimRewards();
        _deleverage(type(uint256).max);
        _withdrawUnderlying(balanceOfPool);
    }



    /**
     * @dev Helper modifier for functions that need to update the internal balance at the end of their execution.
     */
    modifier doUpdateBalance() {
        _;
        updateBalance();
    }
}
