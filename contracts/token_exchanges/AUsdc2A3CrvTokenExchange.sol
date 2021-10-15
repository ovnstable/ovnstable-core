// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ITokenExchange.sol";
import "../interfaces/IConnector.sol";

contract AUsdc2A3CrvTokenExchange is ITokenExchange {
    IConnector curveConnector;
    IERC20 aUsdcToken;
    IERC20 a3CrvToken;

    constructor(
        address _curveConnector,
        address _aUsdcToken,
        address _a3CrvToken
    ) {
        require(_curveConnector != address(0), "Zero address not allowed");
        require(_aUsdcToken != address(0), "Zero address not allowed");
        require(_a3CrvToken != address(0), "Zero address not allowed");

        curveConnector = IConnector(_curveConnector);
        aUsdcToken = IERC20(_aUsdcToken);
        a3CrvToken = IERC20(_a3CrvToken);
    }

    function exchange(
        address spender,
        IERC20 from,
        address receiver,
        IERC20 to,
        uint256 amount
    ) external override {
        require(
            (from == aUsdcToken && to == a3CrvToken) || (from == a3CrvToken && to == aUsdcToken),
            "AUsdc2A3CrvTokenExchange: Some token not compatible"
        );

        if (from == aUsdcToken && to == a3CrvToken) {
            require(
                aUsdcToken.balanceOf(address(this)) >= amount,
                "AUsdc2A3CrvTokenExchange: Not enought aUsdcToken tokens"
            );

            aUsdcToken.transfer(address(curveConnector), amount);
            curveConnector.stake(address(aUsdcToken), amount, receiver);
        } else {
            // try a3CrvToken.transfer(address(curveConnector), amount) {
            //     try curveConnector.unstake(address(aUsdcToken), amount, receiver) returns(uint256 withdrewAmount) {
            //     } catch Error(string memory reason) {
            //         revert(reason);
            //     } catch {
            //         revert(
            //             string(
            //                 abi.encodePacked(
            //                     "curveConnector.unstake"
            //                 )
            //             )
            //         );
            //     }
            // } catch Error(string memory reason) {
            //     revert(reason);
            // } catch {
            //     revert(
            //         string(
            //             abi.encodePacked(
            //                 "a3CrvToken.transfer"
            //             )
            //         )
            //     );
            // }

            //TODO: denominator usage
            uint256 a3CrvAmount = amount * (10**12);
            require(
                a3CrvToken.balanceOf(address(this)) >= a3CrvAmount,
                "AUsdc2A3CrvTokenExchange: Not enought a3Crv tokens"
            );

            a3CrvToken.transfer(address(curveConnector), a3CrvAmount);
            uint256 withdrewAmount = curveConnector.unstake(address(aUsdcToken), amount, receiver);

            //TODO: may be add some checks for withdrewAmount
        }
    }
}
