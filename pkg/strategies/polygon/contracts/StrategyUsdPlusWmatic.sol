// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IUsdPlusToken.sol";
import "./interfaces/IExchange.sol";
import "./interfaces/IRebaseToken.sol";
import "./connectors/dystopia/interfaces/IDystopiaRouter.sol";
import "./connectors/dystopia/interfaces/IDystopiaLP.sol";
import "./connectors/aave/interfaces/IPriceFeed.sol";
import "./connectors/aave/interfaces/IPool.sol";
import "./connectors/aave/interfaces/IPoolAddressesProvider.sol";
import "./connectors/penrose/interface/IUserProxy.sol";
import "./connectors/penrose/interface/IPenLens.sol";
import "./libraries/WadRayMath.sol";

import {AaveBorrowLibrary} from "./libraries/AaveBorrowLibrary.sol";
import {OvnMath} from "./libraries/OvnMath.sol";
import {DystopiaLibrary} from "./libraries/DystopiaLibrary.sol";


import "hardhat/console.sol";

contract StrategyUsdPlusWmatic is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    using WadRayMath for uint256;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint8 public constant E_MODE_CATEGORY_ID = 0;
    uint256 public constant INTEREST_RATE_MODE = 2;
    uint16 public constant REFERRAL_CODE = 0;
    uint256 constant BASIS_POINTS_FOR_STORAGE = 100; // 1%
    uint256 constant BASIS_POINTS_FOR_SLIPPAGE = 4; // 0.04%


    // --- rebase

    IExchange public exchange;
    IUsdPlusToken public usdPlus;
    IRebaseToken public rebase;

    uint256 public buyFee;
    uint256 public buyFeeDenominator; // ~ 100 %

    uint256 public redeemFee;
    uint256 public redeemFeeDenominator; // ~ 100 %

    uint256 public nextPayoutTime;
    uint256 public payoutPeriod;
    uint256 public payoutTimeRange;


    // strategy

    IERC20 public usdc;
    IERC20 public aUsdc;
    IERC20 public wmatic;
    IERC20 public dyst;

    uint256 public usdcDm;
    uint256 public wmaticDm;

    IDystopiaRouter public dystRouter;
    IDystopiaLP public dystRewards;
    IDystopiaLP public dystVault;


    IERC20 public penToken;
    IUserProxy public penProxy;
    IPenLens public penLens;


    // Aave
    IPoolAddressesProvider public aavePoolAddressesProvider;
    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleWmatic;

    uint256 public usdcStorage;

    uint256 public liquidationThreshold;
    uint256 public healthFactor;
    uint256 public balancingDelta;
    uint256 public realHealthFactor;


    event Reward(uint256 amount);
    event Payout();

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);

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


    // --- Setters

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
    }

    function setTokens(
        address _usdc,
        address _aUsdc,
        address _wmatic,
        address _usdPlus,
        address _penToken,
        address _rebase,
        address _dyst
    ) external onlyAdmin {
        usdc = IERC20(_usdc);
        aUsdc = IERC20(_aUsdc);
        wmatic = IERC20(_wmatic);
        usdcDm = 10 ** IERC20Metadata(_usdc).decimals();
        wmaticDm = 10 ** IERC20Metadata(_wmatic).decimals();

        usdPlus = IUsdPlusToken(_usdPlus);

        penToken = IERC20(_penToken);
        dyst = IERC20(_dyst);

        rebase = IRebaseToken(_rebase);
    }

    function setBuyFee(uint256 _fee, uint256 _feeDenominator) external onlyAdmin {
        require(_feeDenominator != 0, "Zero denominator not allowed");
        buyFee = _fee;
        buyFeeDenominator = _feeDenominator;
    }

    function setRedeemFee(uint256 _fee, uint256 _feeDenominator) external onlyAdmin {
        require(_feeDenominator != 0, "Zero denominator not allowed");
        redeemFee = _fee;
        redeemFeeDenominator = _feeDenominator;
    }


    function setParams(
        address _exchange,
        address _dystRewards,
        address _dystVault,
        address _dystRouter,
        address _penProxy,
        address _penLens
    ) external onlyAdmin {

        dystRewards = IDystopiaLP(_dystRewards);
        dystVault = IDystopiaLP(_dystVault);
        dystRouter = IDystopiaRouter(_dystRouter);

        exchange = IExchange(_exchange);

        penProxy = IUserProxy(_penProxy);
        penLens = IPenLens(_penLens);
    }

    function setAaveParams(
        address _aavePoolAddressesProvider,
        address _oracleUsdc,
        address _oracleWmatic,
        uint256 _liquidationThreshold,
        uint256 _healthFactor,
        uint256 _balancingDelta
    ) external onlyAdmin {

        aavePoolAddressesProvider = IPoolAddressesProvider(_aavePoolAddressesProvider);
        oracleUsdc = IPriceFeed(_oracleUsdc);
        oracleWmatic = IPriceFeed(_oracleWmatic);

        liquidationThreshold = _liquidationThreshold * 10 ** 15;
        healthFactor = _healthFactor * 10 ** 15;
        realHealthFactor = 0;
        balancingDelta = _balancingDelta * 10 ** 15;
    }

    function buy(uint256 _amount) external returns (uint256) {
        uint256 currentBalance = IERC20(address(usdPlus)).balanceOf(msg.sender);
        require(currentBalance >= _amount, "Not enough tokens to buy");

        usdPlus.transferFrom(msg.sender, address(this), _amount);

        _borrowWmatic();
        _stakeDystopiaToPenrose();

        uint256 buyFeeAmount = (_amount * buyFee) / buyFeeDenominator;
        uint256 buyAmount = _amount - buyFeeAmount;
        rebase.mint(msg.sender, buyAmount);

        return buyAmount;
    }

    function redeem(uint256 _amount) external returns (uint256) {
        require(_amount != 0, "Zero amount");

        uint256 redeemFeeAmount = (_amount * redeemFee) / redeemFeeDenominator;
        uint256 redeemAmount = _amount - redeemFeeAmount;

        _unstake(redeemAmount);

        rebase.burn(msg.sender, _amount);
        usdPlus.transfer(msg.sender, redeemAmount);
        return redeemAmount;
    }


    function _unstake(
        uint256 _amount
    ) internal returns (uint256) {

        // 1. Recalculate target amount and decreese usdcStorage proportionately.
        uint256 amount = OvnMath.subBasisPoints(_amount, BASIS_POINTS_FOR_STORAGE);
        usdcStorage = usdcStorage - (_amount - amount);
        amount += 10;

        (uint256 reserveWmatic, uint256 reserveUsdPlus,) = dystVault.getReserves();


        uint256 wmaticBorrow = AaveBorrowLibrary.getBorrowForWithdraw(
            amount,
            reserveWmatic,
            reserveUsdPlus,
            liquidationThreshold,
            healthFactor,
            usdcDm,
            wmaticDm,
            uint256(oracleUsdc.latestAnswer()),
            uint256(oracleWmatic.latestAnswer())
        );


        console.log('Reserve WMATIC      %s', reserveWmatic / 1e18);
        console.log('Reserve USD+        %s', reserveUsdPlus / 1e6);
        console.log('Amount              %s', amount / 1e6);
        console.log('UsdcStorage         %s', usdcStorage );
        console.log('wmaticBorrow        %s', wmaticBorrow );



        return 0;
    }


    function _stakeDystopiaToPenrose() internal {


        // 1. Stake to Dystopia
        uint256 usdPlusAmount = usdPlus.balanceOf(address(this));
        uint256 wmaticAmount = wmatic.balanceOf(address(this));

        usdPlus.approve(address(dystRouter), usdPlusAmount);
        wmatic.approve(address(dystRouter), wmaticAmount);

        dystRouter.addLiquidity(
            address(wmatic),
            address(usdPlus),
            false,
            wmaticAmount,
            usdPlusAmount,
            (wmaticAmount < 10000) ? 0 : OvnMath.subBasisPoints(wmaticAmount, BASIS_POINTS_FOR_SLIPPAGE),
            (usdPlusAmount < 10000) ? 0 : OvnMath.subBasisPoints(usdPlusAmount, BASIS_POINTS_FOR_SLIPPAGE),
            address(this),
            block.timestamp + 600
        );

        // 2. Stake to Penrose
        uint256 lpTokenBalance = dystVault.balanceOf(address(this));
        dystVault.approve(address(penProxy), lpTokenBalance);
        penProxy.depositLpAndStake(address(dystVault), lpTokenBalance);
    }

    function _borrowWmatic() internal {

        (uint256 reserveWmatic, uint256 reserveUsdPlus,) = dystVault.getReserves();

        uint256 balanceUsdPlus = usdPlus.balanceOf(address(this));
        uint256 redeemFeeAmount = (balanceUsdPlus * exchange.redeemFee()) / exchange.redeemFeeDenominator();
        balanceUsdPlus = balanceUsdPlus - redeemFeeAmount;

        // 1. Recalculate target amount and increese usdcStorage proportionately.
        uint256 amount = OvnMath.subBasisPoints(balanceUsdPlus - usdcStorage, BASIS_POINTS_FOR_STORAGE);
        usdcStorage = balanceUsdPlus - amount;

        (uint256 usdcCollateral, uint256 wmaticBorrow) = AaveBorrowLibrary.getCollateralAndBorrowForSupplyAndBorrow(
            balanceUsdPlus,
            reserveUsdPlus,
            reserveWmatic,
            liquidationThreshold,
            healthFactor,
            usdcDm,
            wmaticDm,
            uint256(oracleUsdc.latestAnswer()),
            uint256(oracleWmatic.latestAnswer())
        );


        uint256 redeemUsdcCollateral = usdcCollateral + (usdcCollateral * exchange.redeemFee()) / exchange.redeemFeeDenominator() + 100;
        exchange.redeem(address(usdc), redeemUsdcCollateral);

        IPool aavePool = _aavePool();

        usdc.approve(address(aavePool), usdcCollateral);
        aavePool.supply(address(usdc), usdcCollateral, address(this), REFERRAL_CODE);
        aavePool.borrow(address(wmatic), wmaticBorrow, INTEREST_RATE_MODE, REFERRAL_CODE, address(this));
    }

    function _aavePool() internal returns (IPool aavePool){
        aavePool = IPool(AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider), E_MODE_CATEGORY_ID));
    }


    function _showAave() internal {

        IPool aave = _aavePool();

        (uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor) = aave.getUserAccountData(address(this));


        console.log('---AAVE---');
        console.log('totalCollateralBase:         %s', totalCollateralBase);
        console.log('totalDebtBase:               %s', totalDebtBase);
        console.log('availableBorrowsBase:        %s', availableBorrowsBase);
        console.log('currentLiquidationThreshold: %s', currentLiquidationThreshold);
        console.log('ltv:                         %s', ltv);
        console.log('healthFactor:                %s', healthFactor);
        console.log('');

    }

    function _showBalances() internal {
        console.log('---Balances---');
        console.log('USDC     %s', usdc.balanceOf(address(this)) / 1e6);
        console.log('USD+     %s', usdPlus.balanceOf(address(this)) / 1e6);
        console.log('WMATIC   %s', wmatic.balanceOf(address(this)) / 1e18);
        console.log('Dystopia %s', dystVault.balanceOf(address(this)));

        address userProxyThis = penLens.userProxyByAccount(address(this));
        address stakingAddress = penLens.stakingRewardsByDystPool(address(dystVault));
        uint256 lpTokenBalance = IERC20(stakingAddress).balanceOf(userProxyThis);

        console.log('Penrose %s', lpTokenBalance);

    }

    function nav() public view returns (uint256){

        address userProxyThis = penLens.userProxyByAccount(address(this));
        address stakingAddress = penLens.stakingRewardsByDystPool(address(dystVault));
        uint256 balanceLp = IERC20(stakingAddress).balanceOf(userProxyThis);

        if (balanceLp == 0)
            return 0;

        (uint256 poolWmatic, uint256 poolUsdPlus) = _getLiquidity(balanceLp);
        uint256 totalUsdPlus = poolUsdPlus;
        uint256 totalUsdc = usdc.balanceOf(address(this)) + aUsdc.balanceOf(address(this));


        // debt base (USD) convert to Wmatic amount
        (, uint256 debtBase,,,,) = IPool(AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider))).getUserAccountData(address(this));
        uint256 aaveWmatic = AaveBorrowLibrary.convertUsdToTokenAmount(debtBase, wmaticDm, uint256(oracleWmatic.latestAnswer()));

        if (aaveWmatic < poolWmatic) {
            uint256 deltaWmatic = poolWmatic - aaveWmatic;
            totalUsdc += AaveBorrowLibrary.convertTokenAmountToTokenAmount(
                deltaWmatic,
                wmaticDm,
                usdcDm,
                uint256(oracleWmatic.latestAnswer()),
                uint256(oracleUsdc.latestAnswer())
            );

        } else {
            uint256 deltaWmatic = aaveWmatic - poolWmatic;
            totalUsdc -= AaveBorrowLibrary.convertTokenAmountToTokenAmount(
                deltaWmatic,
                wmaticDm,
                usdcDm,
                uint256(oracleWmatic.latestAnswer()),
                uint256(oracleUsdc.latestAnswer())
            );
        }

        return totalUsdPlus + totalUsdc;
    }

    function _getLiquidity(uint256 balanceLp) public view returns (uint256, uint256) {
        (uint256 amount0Current, uint256 amount1Current,) = dystVault.getReserves();

        uint256 amountLiq0 = amount0Current * balanceLp / dystVault.totalSupply();
        uint256 amountLiq1 = amount1Current * balanceLp / dystVault.totalSupply();
        return (amountLiq0, amountLiq1);
    }



    function _claimRewards() internal  {

        // claim rewards
        penProxy.claimStakingRewards();

        // sell rewards
        uint256 totalUsdc = 0;

        uint256 dystBalance = dyst.balanceOf(address(this));
        if (dystBalance > 0) {
            uint256 dystUsdc = DystopiaLibrary._swapExactTokensForTokens(
                dystRouter,
                address(dyst),
                address(wmatic),
                address(usdc),
                false,
                false,
                dystBalance,
                address(this)
            );
            totalUsdc += dystUsdc;
        }

        uint256 penBalance = penToken.balanceOf(address(this));
        if (penBalance > 0) {
            uint256 penUsdc = DystopiaLibrary._swapExactTokensForTokens(
                dystRouter,
                address(penToken),
                address(wmatic),
                address(usdc),
                false,
                false,
                penBalance,
                address(this)
            );
            totalUsdc += penUsdc;
        }

        emit Reward(totalUsdc);
    }


    function _balance() internal {

        // Balance HF
    }

    function payout() public {
        _payout();
    }

    function _payout() internal {
        if (block.timestamp + payoutTimeRange < nextPayoutTime) {
            return;
        }

        // 0. call claiming reward and balancing on PM
        // 1. get current amount of NAV
        // 2. get total sum of USDC we can get from any source
        // 3. calc difference between total count of Rebase and USDC
        // 4. update Rebase liquidity index

        _claimRewards();
        _balance();

        uint256 totalRebaseSupplyRay = rebase.scaledTotalSupply();
        uint256 totalRebaseSupply = totalRebaseSupplyRay.rayToWad();
        uint256 totalUsdc = nav();


        uint difference;
        if (totalUsdc <= totalRebaseSupply) {
            difference = totalRebaseSupply - totalUsdc;
        } else {
            difference = totalUsdc - totalRebaseSupply;
        }

        uint256 totalUsdcSupplyRay = totalUsdc.wadToRay();
        // in ray
        uint256 newLiquidityIndex = totalUsdcSupplyRay.rayDiv(totalRebaseSupplyRay);
        uint256 currentLiquidityIndex = rebase.liquidityIndex();

        uint256 delta = (newLiquidityIndex * 1e6) / currentLiquidityIndex;

        rebase.setLiquidityIndex(newLiquidityIndex);

        emit Payout();

        // update next payout time. Cycle for preventing gaps
        for (; block.timestamp >= nextPayoutTime - payoutTimeRange;) {
            nextPayoutTime = nextPayoutTime + payoutPeriod;
        }
    }

}
