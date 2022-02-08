// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../interfaces/IStrategy.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../connectors/curve/interfaces/IRewardOnlyGauge.sol";
import "../connectors/curve/interfaces/iCurvePool.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "../connectors/aave/interfaces/ILendingPoolAddressesProvider.sol";
import "../connectors/aave/interfaces/ILendingPool.sol";
import "../connectors/QuickswapExchange.sol";

import "hardhat/console.sol";

contract StrategyCurve is IStrategy, AccessControlUpgradeable, UUPSUpgradeable, QuickswapExchange {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PORTFOLIO_MANAGER = keccak256("UPGRADER_ROLE");

    address public portfolioManager;
    iCurvePool public curve;
    ILendingPoolAddressesProvider public aave;
    IRewardOnlyGauge public rewardGauge;

    IERC20 public usdc;
    IERC20 public aUsdc;
    IERC20 public a3CrvToken;
    IERC20 public a3CrvGaugeToken;
    IERC20 public wMatic;
    IERC20 public crv;

    uint256 public crvTokenDenominator;
    uint256 public wmaticTokenDenominator;

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override
    {}

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyPortfolioManager() {
        require(hasRole(PORTFOLIO_MANAGER, msg.sender), "Restricted to PORTFOLIO_MANAGER");
        _;
    }


    // --- Setters

    function setParams(
        address _aave,
        address _curve,
        address _rewardGauge,
        address _quickswapExchange,
        address _usdc,
        address _aUsdc,
        address _a3CrvToken,
        address _a3CrvGaugeToken,
        address _wMatic,
        address _crv) external onlyAdmin {

        require(_aave != address(0), "Zero address not allowed");
        require(_curve != address(0), "Zero address not allowed");
        require(_rewardGauge != address(0), "Zero address not allowed");
        require(_quickswapExchange != address(0), "Zero address not allowed");
        require(_usdc != address(0), "Zero address not allowed");
        require(_aUsdc != address(0), "Zero address not allowed");
        require(_a3CrvToken != address(0), "Zero address not allowed");
        require(_a3CrvGaugeToken != address(0), "Zero address not allowed");
        require(_wMatic != address(0), "Zero address not allowed");
        require(_crv != address(0), "Zero address not allowed");

        rewardGauge = IRewardOnlyGauge(_rewardGauge);
        curve = iCurvePool(_curve);
        aave = ILendingPoolAddressesProvider(_aave);

        setSwapRouter(_quickswapExchange);

        usdc = IERC20(_usdc);
        wMatic = IERC20(_wMatic);
        crv = IERC20(_crv);
        aUsdc = IERC20(_aUsdc);
        a3CrvToken = IERC20(_a3CrvToken);
        a3CrvGaugeToken = IERC20(_a3CrvGaugeToken);

        crvTokenDenominator = 10 ** IERC20Metadata(_crv).decimals();
        wmaticTokenDenominator = 10 ** IERC20Metadata(_wMatic).decimals();
    }


    function setPortfolioManager(address _value) public onlyAdmin {
        require(_value != address(0), "Zero address not allowed");

        revokeRole(PORTFOLIO_MANAGER, portfolioManager);
        grantRole(PORTFOLIO_MANAGER, _value);

        portfolioManager = _value;
        emit PortfolioManagerUpdated(_value);
    }


    // --- logic

    function stake(
        address _asset,
        uint256 _amount
    ) override external onlyPortfolioManager {
        require(_asset == address(usdc), "Some token not compatible");

        address current = address(this);

        _stakeAave(address(usdc), _amount, current);
        _stakeCurve(address(aUsdc), _amount, current);

        uint256 a3CrvBalance = a3CrvToken.balanceOf(current);
        a3CrvToken.approve(address(rewardGauge), a3CrvBalance);
        rewardGauge.deposit(a3CrvBalance, current, false);

    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) override external onlyPortfolioManager returns (uint256) {
        require(_asset == address(usdc), "Some token not compatible");

        address current = address(this);
        // gauge doesn't need approve on withdraw, but we should have amount token
        // on Strategy

        // Am3CrvGauge = 6 + 12
        uint256 tokenAmount = _amount * (10 ** 12);

        console.log('Unstake gauge before');
        console.log('usdc %s', usdc.balanceOf(current) / 10 ** 6);
        console.log('aUsdc %s', aUsdc.balanceOf(current) / 10 ** 6);
        console.log('a3Crv %s', a3CrvToken.balanceOf(current) / 10 ** 18);
        console.log('a3CrvGauge %s', a3CrvGaugeToken.balanceOf(current) / 10 ** 18);

        rewardGauge.withdraw(tokenAmount, false);

        console.log('Unstake curve before');
        console.log('usdc %s', usdc.balanceOf(current) / 10 ** 6);
        console.log('aUsdc %s', aUsdc.balanceOf(current) / 10 ** 6);
        console.log('a3Crv %s', a3CrvToken.balanceOf(current) / 10 ** 18);
        console.log('a3CrvGauge %s', a3CrvGaugeToken.balanceOf(current) / 10 ** 18);

        uint256 withdrewAmount = _unstakeCurve();

        console.log('Unstake aave before');
        console.log('usdc %s', usdc.balanceOf(current) / 10 ** 6);
        console.log('aUsdc %s', aUsdc.balanceOf(current) / 10 ** 6);
        console.log('a3Crv %s', a3CrvToken.balanceOf(current) / 10 ** 18);
        console.log('a3CrvGauge %s', a3CrvGaugeToken.balanceOf(current) / 10 ** 18);


        withdrewAmount = _unstakeAave();

        console.log('WithdrewaAmount %s, amount %s', withdrewAmount, _amount);
        console.log('usdc %s', usdc.balanceOf(current) / 10 ** 6);
        console.log('aUsdc %s', aUsdc.balanceOf(current) / 10 ** 6);
        console.log('a3Crv %s', a3CrvToken.balanceOf(current) / 10 ** 18);
        console.log('a3CrvGauge %s', a3CrvGaugeToken.balanceOf(current) / 10 ** 18);

        require(withdrewAmount >= _amount, 'Returned value less than requested amount');

        usdc.transfer(_beneficiary, withdrewAmount);

        return withdrewAmount;
    }

    function netAssetValue() external view override returns (uint256){
        uint256 balance = a3CrvGaugeToken.balanceOf(address(this));
        // 18
        uint256 price = curve.get_virtual_price();
        // 18

        // 18 + 18 = 36
        uint256 result = (balance * price);

        // 36 - 18 - 12 = 6
        return (result / (10 ** 18)) / 10 ** 12;

    }

    function liquidationValue() external view override returns (uint256){
        uint256 balance = a3CrvGaugeToken.balanceOf(address(this));
        // 18
        uint256 price = curve.get_virtual_price();
        // 18

        // 18 + 18 = 36
        uint256 result = (balance * price);

        // 36 - 18 - 12 = 6
        return (result / (10 ** 18)) / 10 ** 12;
    }


    function _stakeAave(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal {
        ILendingPool pool = ILendingPool(aave.getLendingPool());
        IERC20(_asset).approve(address(pool), _amount);
        pool.deposit(_asset, _amount, _beneficiary, 0);
    }

    function _unstakeAave(
    ) internal returns (uint256) {
        ILendingPool pool = ILendingPool(aave.getLendingPool());

        uint256 w = pool.withdraw(address(usdc), aUsdc.balanceOf(address(this)), address(this));
        DataTypes.ReserveData memory res = pool.getReserveData(address(usdc));

        //TODO: use _to to for returning tokens
        IERC20(res.aTokenAddress).transfer(
            msg.sender,
            IERC20(res.aTokenAddress).balanceOf(address(this))
        );
        return w;
    }

    function _stakeCurve(
        address _asset,
        uint256 _amount,
        address _beneficiar
    ) internal {
        uint256[3] memory amounts;
        for (uint256 i = 0; i < 3; i++) {
            address coin = curve.coins(i);
            if (coin == _asset) {
                IERC20(_asset).approve(address(curve), _amount);
                // номер позиции в массиве (amounts) определяет какой актив (_asset) и в каком количестве (_amount)
                // на стороне керва будет застейкано
                amounts[uint256(i)] = _amount;
                uint256 lpTokAmount = curve.calc_token_amount(amounts, true);
                //TODO: процентажи кудато вынести, slippage
                uint256 retAmount = curve.add_liquidity(amounts, (lpTokAmount * 99) / 100, false);
                IERC20(curve.lp_token()).transfer(_beneficiar, retAmount);

                return;
            } else {
                amounts[i] = 0;
            }
        }
        revert("can't find active for staking in curve");
    }


    function _unstakeCurve() internal returns (uint256) {
        uint256[3] memory amounts;

        uint256 _amount = a3CrvToken.balanceOf(address(this)) / 10 ** 12;
        a3CrvToken.approve(address(curve), _amount);

        uint256 index = 1;
        // index got from curve.coins(i);
        amounts[index] = _amount;
        console.log("Calc_token_amount: %s", _amount);

        uint256 onConnectorLpTokenAmount = a3CrvToken.balanceOf(address(this));

        uint256 lpTokAmount = curve.calc_token_amount(amounts, false);
        // _one_coin для возврата конкретной монеты (_assest)
        uint256 withdrawAmount = curve.calc_withdraw_one_coin(lpTokAmount, int128(uint128(index)));
        if (withdrawAmount > onConnectorLpTokenAmount) {
            revert(string(
                abi.encodePacked(
                    "Not enough lpToken own ",
                    " _amount: ",
                    Strings.toString(_amount),
                    " lpTok: ",
                    Strings.toString(lpTokAmount),
                    " onConnectorLpTokenAmount: ",
                    Strings.toString(onConnectorLpTokenAmount),
                    " withdrawAmount: ",
                    Strings.toString(withdrawAmount)
                )
            ));
        }

        IERC20 lpToken = IERC20(curve.lp_token());
        console.log("Lp Token approve: %s, index %s", address(curve), lpTokAmount);
        lpToken.approve(address(curve), lpTokAmount);

        console.log("Remove_liq_one_coin: %s, %s", lpTokAmount, index);
        //TODO: use withdrawAmount?
        uint256 retAmount = curve.remove_liquidity_one_coin(lpTokAmount, int128(uint128(index)), 0);
        return retAmount;
    }

    function claimRewards(address _to) external override onlyPortfolioManager returns (uint256){
        rewardGauge.claim_rewards(address(this));

        uint256 totalUsdc;


        uint256 crvBalance = crv.balanceOf(address(this));
        if (crvBalance != 0) {
            uint256 crvUsdc = swapTokenToUsdc(address(crv), address(usdc), crvTokenDenominator,
                address(this), address(_to), crvBalance);
            totalUsdc += crvUsdc;
        }

        uint256 wmaticBalance = wMatic.balanceOf(address(this));
        if (wmaticBalance != 0) {
            uint256 wmaticUsdc = swapTokenToUsdc(address(wMatic), address(usdc), wmaticTokenDenominator,
                address(this), address(_to), wmaticBalance);
            totalUsdc += wmaticUsdc;
        }

        emit Reward(totalUsdc);
        return totalUsdc;
    }

}
