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

contract StrategyCurve is IStrategy, QuickswapExchange, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PORTFOLIO_MANAGER = keccak256("UPGRADER_ROLE");

    IERC20 public usdcToken;
    IERC20 public aUsdcToken;
    IERC20 public a3CrvToken;
    IERC20 public a3CrvGaugeToken;
    IERC20 public crvToken;
    IERC20 public wmaticToken;

    uint256 public usdcTokenDenominator;
    uint256 public a3CrvTokenDenominator;
    uint256 public crvTokenDenominator;
    uint256 public wmaticTokenDenominator;

    ILendingPoolAddressesProvider public aavePool;
    iCurvePool public curvePool;
    IRewardOnlyGauge public rewardGauge;


    // --- events

    event StrategyCurveUpdatedTokens(address usdcToken, address aUsdcToken, address a3CrvToken, address a3CrvGaugeToken,
        address crvToken, address wmaticToken,uint256 usdcTokenDenominator, uint256 a3CrvTokenDenominator,
        uint256 crvTokenDenominator, uint256 wmaticTokenDenominator);

    event StrategyCurveUpdatedParams(address aavePool, address curvePool, address rewardGauge, address uniswapRouter);


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

    function setTokens(
        address _usdcToken,
        address _aUsdcToken,
        address _a3CrvToken,
        address _a3CrvGaugeToken,
        address _crvToken,
        address _wmaticToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_aUsdcToken != address(0), "Zero address not allowed");
        require(_a3CrvToken != address(0), "Zero address not allowed");
        require(_a3CrvGaugeToken != address(0), "Zero address not allowed");
        require(_crvToken != address(0), "Zero address not allowed");
        require(_wmaticToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        aUsdcToken = IERC20(_aUsdcToken);
        a3CrvToken = IERC20(_a3CrvToken);
        a3CrvGaugeToken = IERC20(_a3CrvGaugeToken);
        crvToken = IERC20(_crvToken);
        wmaticToken = IERC20(_wmaticToken);

        usdcTokenDenominator = 10 ** IERC20Metadata(_usdcToken).decimals();
        a3CrvTokenDenominator = 10 ** IERC20Metadata(_a3CrvToken).decimals();
        crvTokenDenominator = 10 ** IERC20Metadata(_crvToken).decimals();
        wmaticTokenDenominator = 10 ** IERC20Metadata(_wmaticToken).decimals();

        emit StrategyCurveUpdatedTokens(_usdcToken, _aUsdcToken, _a3CrvToken, _a3CrvGaugeToken, _crvToken, _wmaticToken,
            usdcTokenDenominator, a3CrvTokenDenominator, crvTokenDenominator, wmaticTokenDenominator);
    }

    function setParams(
        address _aavePool,
        address _curvePool,
        address _rewardGauge,
        address _uniswapRouter
    ) external onlyAdmin {

        require(_aavePool != address(0), "Zero address not allowed");
        require(_curvePool != address(0), "Zero address not allowed");
        require(_rewardGauge != address(0), "Zero address not allowed");
        require(_uniswapRouter != address(0), "Zero address not allowed");

        aavePool = ILendingPoolAddressesProvider(_aavePool);
        curvePool = iCurvePool(_curvePool);
        rewardGauge = IRewardOnlyGauge(_rewardGauge);
        setUniswapRouter(_uniswapRouter);

        emit StrategyCurveUpdatedParams(_aavePool, _curvePool, _rewardGauge, _uniswapRouter);
    }

    // --- logic

    function stake(
        address _asset,
        uint256 _amount
    ) override external onlyPortfolioManager {
        require(_asset == address(usdcToken), "Some token not compatible");

        address current = address(this);

        _stakeAave(address(usdcToken), _amount, current);
        _stakeCurve(address(aUsdcToken), _amount, current);

        uint256 a3CrvBalance = a3CrvToken.balanceOf(current);
        a3CrvToken.approve(address(rewardGauge), a3CrvBalance);
        rewardGauge.deposit(a3CrvBalance, current, false);

    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) override external onlyPortfolioManager returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");

        address current = address(this);
        // gauge doesn't need approve on withdraw, but we should have amount token
        // on tokenExchange
        uint256 tokenAmount = (curvePool.get_virtual_price() / 10 ** 12) * _amount;

        console.log('usdc %s', usdcToken.balanceOf(current));
        console.log('aUsdc %s', aUsdcToken.balanceOf(current));
        console.log('a3Crv %s', a3CrvToken.balanceOf(current));
        console.log('a3CrvGauge %s', a3CrvGaugeToken.balanceOf(current));

        rewardGauge.withdraw(tokenAmount, false);
        console.log('usdc %s', usdcToken.balanceOf(current));
        console.log('aUsdc %s', aUsdcToken.balanceOf(current));
        console.log('a3Crv %s', a3CrvToken.balanceOf(current));
        console.log('a3CrvGauge %s', a3CrvGaugeToken.balanceOf(current));

        uint256 withdrewAmount = _unstakeCurve();

        console.log('usdc %s', usdcToken.balanceOf(current));
        console.log('aUsdc %s', aUsdcToken.balanceOf(current));
        console.log('a3Crv %s', a3CrvToken.balanceOf(current));
        console.log('a3CrvGauge %s', a3CrvGaugeToken.balanceOf(current));


        withdrewAmount = _unstakeAave();

        console.log('usdc %s', usdcToken.balanceOf(current));
        console.log('aUsdc %s', aUsdcToken.balanceOf(current));
        console.log('a3Crv %s', a3CrvToken.balanceOf(current));
        console.log('a3CrvGauge %s', a3CrvGaugeToken.balanceOf(current));


        require(withdrewAmount >= _amount, 'Returned value less than requested amount');
        return withdrewAmount;
    }

    function netAssetValue() external view override returns (uint256){
        uint256 balance = a3CrvGaugeToken.balanceOf(address(this));
        // 18
        uint256 price = curvePool.get_virtual_price();
        // 18

        // 18 + 18 = 36
        uint256 result = (balance * price);

        // 36 - 18 - 12 = 6
        return (result / (10 ** 18)) / 10 ** 12;

    }

    function liquidationValue() external view override returns (uint256){
        uint256 balance = a3CrvGaugeToken.balanceOf(address(this));
        // 18
        uint256 price = curvePool.get_virtual_price();
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
        ILendingPool pool = ILendingPool(aavePool.getLendingPool());
        IERC20(_asset).approve(address(pool), _amount);
        pool.deposit(_asset, _amount, _beneficiary, 0);
    }

    function _unstakeAave(
    ) internal returns (uint256) {
        ILendingPool pool = ILendingPool(aavePool.getLendingPool());

        uint256 w = pool.withdraw(address(usdcToken), aUsdcToken.balanceOf(address(this)), address(this));
        DataTypes.ReserveData memory res = pool.getReserveData(address(usdcToken));

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
            address coin = curvePool.coins(i);
            if (coin == _asset) {
                IERC20(_asset).approve(address(curvePool), _amount);
                // номер позиции в массиве (amounts) определяет какой актив (_asset) и в каком количестве (_amount)
                // на стороне керва будет застейкано
                amounts[uint256(i)] = _amount;
                uint256 lpTokAmount = curvePool.calc_token_amount(amounts, true);
                //TODO: процентажи кудато вынести, slippage
                uint256 retAmount = curvePool.add_liquidity(amounts, (lpTokAmount * 99) / 100, false);
                IERC20(curvePool.lp_token()).transfer(_beneficiar, retAmount);

                return;
            } else {
                amounts[i] = 0;
            }
        }
        revert("can't find active for staking in curve");
    }


    function _unstakeCurve() internal returns (uint256) {
        uint256[3] memory amounts;

        uint256 _amount = a3CrvToken.balanceOf(address(this));
        a3CrvToken.approve(address(curvePool), _amount);

        uint256 index = 1;
        // index got from curve.coins(i);
        amounts[index] = _amount;

        uint256 onConnectorLpTokenAmount = a3CrvToken.balanceOf(address(this));

        uint256 lpTokAmount = curvePool.calc_token_amount(amounts, false);
        // _one_coin для возврата конкретной монеты (_assest)
        uint256 withdrawAmount = curvePool.calc_withdraw_one_coin(lpTokAmount, int128(uint128(index)));
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

        //TODO: use withdrawAmount?
        uint256 retAmount = curvePool.remove_liquidity_one_coin(lpTokAmount, int128(uint128(index)), 0);
        return retAmount;
    }

    function claimRewards(address _to) external override onlyPortfolioManager returns (uint256){
        rewardGauge.claim_rewards(address(this));

        uint256 totalUsdc;

        uint256 crvBalance = crvToken.balanceOf(address(this));
        if (crvBalance != 0) {
            uint256 crvUsdc = swapTokenToUsdc(address(crvToken), address(usdcToken), crvTokenDenominator,
                address(this), address(_to), crvBalance);
            totalUsdc += crvUsdc;
        }

        uint256 wmaticBalance = wmaticToken.balanceOf(address(this));
        if (wmaticBalance != 0) {
            uint256 wmaticUsdc = swapTokenToUsdc(address(wmaticToken), address(usdcToken), wmaticTokenDenominator,
                address(this), address(_to), wmaticBalance);
            totalUsdc += wmaticUsdc;
        }

        return totalUsdc;
    }

}
