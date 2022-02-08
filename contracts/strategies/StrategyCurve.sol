// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../connectors/curve/interfaces/IRewardOnlyGauge.sol";
import "../connectors/curve/interfaces/iCurvePool.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "../connectors/aave/interfaces/ILendingPoolAddressesProvider.sol";
import "../connectors/aave/interfaces/ILendingPool.sol";
import "../connectors/QuickswapExchange.sol";

import "hardhat/console.sol";
import "./Strategy.sol";

contract StrategyCurve is Strategy, QuickswapExchange {

    iCurvePool public curve;
    IRewardOnlyGauge public rewardGauge;

    IERC20 public usdc;
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
        __Strategy_init();
    }



    // --- Setters

    function setParams(
        address _curve,
        address _rewardGauge,
        address _quickswapExchange,
        address _usdc,
        address _a3CrvToken,
        address _a3CrvGaugeToken,
        address _wMatic,
        address _crv
    ) external onlyAdmin {

        require(_curve != address(0), "Zero address not allowed");
        require(_rewardGauge != address(0), "Zero address not allowed");
        require(_quickswapExchange != address(0), "Zero address not allowed");
        require(_usdc != address(0), "Zero address not allowed");
        require(_a3CrvToken != address(0), "Zero address not allowed");
        require(_a3CrvGaugeToken != address(0), "Zero address not allowed");
        require(_wMatic != address(0), "Zero address not allowed");
        require(_crv != address(0), "Zero address not allowed");

        rewardGauge = IRewardOnlyGauge(_rewardGauge);
        curve = iCurvePool(_curve);

        setSwapRouter(_quickswapExchange);

        usdc = IERC20(_usdc);
        wMatic = IERC20(_wMatic);
        crv = IERC20(_crv);
        a3CrvToken = IERC20(_a3CrvToken);
        a3CrvGaugeToken = IERC20(_a3CrvGaugeToken);

        crvTokenDenominator = 10 ** IERC20Metadata(_crv).decimals();
        wmaticTokenDenominator = 10 ** IERC20Metadata(_wMatic).decimals();
    }

    // --- logic

    function stake(
        address _asset,
        uint256 _amount
    ) override external onlyPortfolioManager {
        require(_asset == address(usdc), "Some token not compatible");

        address current = address(this);

        _stakeCurve(address(usdc), _amount, current);

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

        // Am3CrvGauge = 6 + 12 + 18 - 18 = 18
        uint256 tokenAmountToWithdrawFromGauge = _amount * 10 ** 30 / curve.get_virtual_price();
        // inc to get extra
        tokenAmountToWithdrawFromGauge += 1;

        console.log('Unstake gauge before');
        console.log('1: _amount %s', _amount);
        console.log('1: get_virtual_price %s', curve.get_virtual_price());
        console.log('1: tokenAmountToWithdrawFromGauge %s', tokenAmountToWithdrawFromGauge);
        console.log('1: usdc %s', usdc.balanceOf(current));
        console.log('1: a3Crv %s', a3CrvToken.balanceOf(current));
        console.log('1: a3CrvGauge %s', a3CrvGaugeToken.balanceOf(current));

        rewardGauge.withdraw(tokenAmountToWithdrawFromGauge, false);

        console.log('Unstake curve before');
        console.log('2: usdc %s', usdc.balanceOf(current));
        console.log('2: a3Crv %s', a3CrvToken.balanceOf(current));
        console.log('2: a3CrvGauge %s', a3CrvGaugeToken.balanceOf(current));

        uint256 withdrewAmount = _unstakeCurve();

        console.log('Unstake curve after: withdrewAmount: %s', withdrewAmount);
        console.log('3: usdc %s', usdc.balanceOf(current));
        console.log('3: a3Crv %s', a3CrvToken.balanceOf(current));
        console.log('3: a3CrvGauge %s', a3CrvGaugeToken.balanceOf(current));

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


    function _stakeCurve(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal {
        uint256[3] memory amounts;
        for (uint256 i = 0; i < 3; i++) {
            address coin = curve.underlying_coins(i);
            if (coin == _asset) {
                IERC20(_asset).approve(address(curve), _amount);
                // номер позиции в массиве (amounts) определяет какой актив (_asset) и в каком количестве (_amount)
                // на стороне керва будет застейкано
                amounts[i] = _amount;
                uint256 lpTokAmount = curve.calc_token_amount(amounts, true);
                //TODO: процентажи кудато вынести, slippage
                uint256 retAmount = curve.add_liquidity(amounts, (lpTokAmount * 99) / 100, true);
                if (_beneficiary != address(this)) {
                    IERC20(curve.lp_token()).transfer(_beneficiary, retAmount);
                }

                return;
            }
        }
        revert("can't find active for staking in curve");
    }


    function _unstakeCurve() internal returns (uint256) {

        // index got from curve.coins(i) for USDC
        uint256 index = 1;
        require(curve.underlying_coins(index) == address(usdc), "Invalid index for unstaking curve");

        uint256 lpTokenAmount = a3CrvToken.balanceOf(address(this));

        // _one_coin для возврата конкретной монеты (_assest)
        uint256 withdrawAmount = curve.calc_withdraw_one_coin(lpTokenAmount, int128(uint128(index)));
        console.log('us 3: withdrawAmount: %s', withdrawAmount);
        if (withdrawAmount > lpTokenAmount) {
            revert(string(
                abi.encodePacked(
                    "Not enough lpToken own ",
                    " lpTokenAmount: ",
                    Strings.toString(lpTokenAmount),
                    " withdrawAmount: ",
                    Strings.toString(withdrawAmount)
                )
            ));
        }

        a3CrvToken.approve(address(curve), lpTokenAmount);

        //TODO: use withdrawAmount?
        uint256 retAmount = curve.remove_liquidity_one_coin(lpTokenAmount, int128(uint128(index)), 0, true);
        return retAmount;
    }

    function claimRewards(address _to) external override onlyPortfolioManager returns (uint256){
        rewardGauge.claim_rewards(address(this));

        uint256 totalUsdc;

        uint256 crvBalance = crv.balanceOf(address(this));
        if (crvBalance != 0) {
            uint256 crvUsdc = swapTokenToUsdc(
                address(crv),
                address(usdc),
                crvTokenDenominator,
                address(this),
                address(_to),
                crvBalance
            );
            totalUsdc += crvUsdc;
        }

        uint256 wmaticBalance = wMatic.balanceOf(address(this));
        if (wmaticBalance != 0) {
            uint256 wmaticUsdc = swapTokenToUsdc(
                address(wMatic),
                address(usdc),
                wmaticTokenDenominator,
                address(this),
                address(_to),
                wmaticBalance
            );
            totalUsdc += wmaticUsdc;
        }

        emit Reward(totalUsdc);
        return totalUsdc;
    }

}
