// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ITokenExchange.sol";
import "../connectors/curve/interfaces/IRewardOnlyGauge.sol";

contract A3Crv2A3CrvGaugeTokenExchange is ITokenExchange {
    IRewardOnlyGauge rewardGauge;
    IERC20 a3CrvToken;
    IERC20 a3CrvGaugeToken;

    constructor(address _curveGauge) {
        require(_curveGauge != address(0), "Zero address not allowed");

        rewardGauge = IRewardOnlyGauge(_curveGauge);
        a3CrvToken = IERC20(rewardGauge.lp_token());
        a3CrvGaugeToken = IERC20(_curveGauge);
    }

    function exchange(
        address spender,
        IERC20 from,
        address receiver,
        IERC20 to,
        uint256 amount
    ) external override {
        require(
            (from == a3CrvToken && to == a3CrvGaugeToken) ||
                (from == a3CrvGaugeToken && to == a3CrvToken),
            "A3Crv2A3CrvGaugeTokenExchange: Some token not compatible"
        );

        if (from == a3CrvToken && to == a3CrvGaugeToken) {
            //TODO: denominator usage
            uint256 a3CrvAmount = amount * (10**12);
            require(
                a3CrvToken.balanceOf(address(this)) >= a3CrvAmount,
                "A3Crv2A3CrvGaugeTokenExchange: Not enough a3CrvToken"
            );

            // gauge need approve on deposit cause by transferFrom inside deposit
            a3CrvToken.approve(address(rewardGauge), a3CrvAmount);
            rewardGauge.deposit(a3CrvAmount, receiver, false);
        } else {
            //TODO: denominator usage
            uint256 a3CrvGaugeAmount = amount * (10**12);
            require(
                a3CrvGaugeToken.balanceOf(address(this)) >= a3CrvGaugeAmount,
                "A3Crv2A3CrvGaugeTokenExchange: Not enough a3CrvGaugeToken"
            );

            // gauge doesn't need approve on withdraw, but we should have amount token
            // on tokenExchange
            rewardGauge.withdraw(a3CrvGaugeAmount, false);
            require(
                a3CrvToken.balanceOf(address(this)) >= a3CrvGaugeAmount,
                "A3Crv2A3CrvGaugeTokenExchange: Not enough a3CrvToken after withdraw"
            );
            // reward gauge transfer tokens to msg.sender, so transfer to receiver
            a3CrvToken.transfer(receiver, a3CrvGaugeAmount);
        }
    }
}
