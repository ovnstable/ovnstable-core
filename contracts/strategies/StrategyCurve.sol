// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../interfaces/IStrategy.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../connectors/curve/interfaces/IRewardOnlyGauge.sol";
import "../connectors/curve/interfaces/iCurvePool.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "hardhat/console.sol";
import "../interfaces/IPriceGetter.sol";
import "../connectors/aave/interfaces/ILendingPoolAddressesProvider.sol";
import "../connectors/aave/interfaces/ILendingPool.sol";
import "../connectors/QuickswapExchange.sol";


contract StrategyCurve is IStrategy, AccessControlUpgradeable, UUPSUpgradeable {

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    iCurvePool public curve;
    ILendingPoolAddressesProvider public aave;
    IRewardOnlyGauge public rewardGauge;
    QuickswapExchange public exchange;

    IERC20 public usdc;
    IERC20 public aUsdc;
    IERC20 public a3CrvToken;
    IERC20 public a3CrvGaugeToken;
    IERC20 public wMatic;
    IERC20 public crv;



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


    // --- Setters

    function setParams(address _aave,
        address _curve,
        address _rewardGauge,
        address _exchange,
        address _usdc,
        address _aUsdc,
        address _a3CrvToken,
        address _a3CrvGaugeToken,
        address _wMatic,
        address _crv) external onlyAdmin {

        require(_aave != address(0), "Zero address not allowed");
        require(_rewardGauge != address(0), "Zero address not allowed");
        require(_exchange != address(0), "Zero address not allowed");
        require(_curve != address(0), "Zero address not allowed");
        require(_usdc != address(0), "Zero address not allowed");
        require(_aUsdc != address(0), "Zero address not allowed");
        require(_a3CrvToken != address(0), "Zero address not allowed");
        require(_a3CrvGaugeToken != address(0), "Zero address not allowed");
        require(_wMatic != address(0), "Zero address not allowed");
        require(_crv != address(0), "Zero address not allowed");

        rewardGauge = IRewardOnlyGauge(_rewardGauge);
        curve = iCurvePool(_curve);
        aave = ILendingPoolAddressesProvider(_aave);
        exchange = QuickswapExchange(_exchange);

        usdc = IERC20(_usdc);
        wMatic = IERC20(_wMatic);
        crv = IERC20(_crv);
        aUsdc = IERC20(_aUsdc);
        a3CrvToken = IERC20(_a3CrvToken);
        a3CrvGaugeToken = IERC20(_a3CrvGaugeToken);
    }



    // --- logic

    function stake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) override external {
        require(_asset == address(usdc), "Some token not compatible");

        address current = address(this);

        _stakeAave(address(usdc), _amount, current);
        _stakeCurve(address(aUsdc), _amount, current);

        uint256 a3CrvBalance = a3CrvToken.balanceOf(current);
        a3CrvToken.approve(address(rewardGauge), a3CrvBalance);
        rewardGauge.deposit(a3CrvBalance, current, false);

        a3CrvGaugeToken.transfer(_beneficiary, a3CrvGaugeToken.balanceOf(current));
    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) override external returns (uint256) {
        require(_asset == address(usdc), "Some token not compatible");

        address current = address(this);
        // gauge doesn't need approve on withdraw, but we should have amount token
        // on tokenExchange

        uint256 tokenAmount = (curve.get_virtual_price() / 10 ** 12) * _amount;

        console.log('usdc %s', usdc.balanceOf(current));
        console.log('aUsdc %s', aUsdc.balanceOf(current));
        console.log('a3Crv %s', a3CrvToken.balanceOf(current));
        console.log('a3CrvGauge %s', a3CrvGaugeToken.balanceOf(current));

        a3CrvGaugeToken.transferFrom(_beneficiary, current, tokenAmount);

        rewardGauge.withdraw(tokenAmount, false);
        console.log('usdc %s', usdc.balanceOf(current));
        console.log('aUsdc %s', aUsdc.balanceOf(current));
        console.log('a3Crv %s', a3CrvToken.balanceOf(current));
        console.log('a3CrvGauge %s', a3CrvGaugeToken.balanceOf(current));

        uint256 withdrewAmount = _unstakeCurve();

        console.log('usdc %s', usdc.balanceOf(current));
        console.log('aUsdc %s', aUsdc.balanceOf(current));
        console.log('a3Crv %s', a3CrvToken.balanceOf(current));
        console.log('a3CrvGauge %s', a3CrvGaugeToken.balanceOf(current));


        withdrewAmount = _unstakeAave();

        console.log('usdc %s', usdc.balanceOf(current));
        console.log('aUsdc %s', aUsdc.balanceOf(current));
        console.log('a3Crv %s', a3CrvToken.balanceOf(current));
        console.log('a3CrvGauge %s', a3CrvGaugeToken.balanceOf(current));

        return withdrewAmount;
    }

    function netAssetValue(address _holder) external view override returns (uint256){
        uint256 balance = a3CrvGaugeToken.balanceOf(_holder);
        // 18
        uint256 price = curve.get_virtual_price();
        // 18

        // 18 + 18 = 36
        uint256 result = (balance * price);

        // 36 - 18 - 12 = 6
        return (result / (10 ** 18)) / 10 ** 12;

    }

    function liquidationValue(address _holder) external view override returns (uint256){
        uint256 balance = a3CrvGaugeToken.balanceOf(_holder);
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

        uint256 _amount = a3CrvToken.balanceOf(address(this));
        a3CrvToken.approve(address(curve), _amount);

        uint256 index = 1; // index got from curve.coins(i);
        amounts[index] = _amount;

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

        //TODO: use withdrawAmount?
        uint256 retAmount = curve.remove_liquidity_one_coin(lpTokAmount, int128(uint128(index)), 0);
        return retAmount;
    }

    function claimRewards(address _beneficiary) external override returns (uint256){
        rewardGauge.claim_rewards(address(this));

        uint256 wmaticUsdc = exchange.swap(address(wMatic), address(usdc), address(this), address(this), wMatic.balanceOf(address(this)))[1];
        uint256 crvUsdc = exchange.swap(address(crv), address(usdc), address(this), address(this), wMatic.balanceOf(address(this)))[1];

        uint256 total = wmaticUsdc + crvUsdc;
        return total;
    }

}
