// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../interfaces/ITokenExchange.sol";
import "../interfaces/IConnector.sol";

contract Usdc2AUsdcTokenExchange is ITokenExchange {
    IConnector aaveConnector;
    IERC20 usdcToken;
    IERC20 aUsdcToken;

    constructor(
        address _aaveConnector,
        address _usdcToken,
        address _aUsdcToken
    ) {
        require(_aaveConnector != address(0), "Zero address not allowed");
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_aUsdcToken != address(0), "Zero address not allowed");

        aaveConnector = IConnector(_aaveConnector);
        usdcToken = IERC20(_usdcToken);
        aUsdcToken = IERC20(_aUsdcToken);
    }

    function exchange(
        address spender,
        IERC20 from,
        address receiver,
        IERC20 to,
        uint256 amount
    ) external override {
        require(
            (from == usdcToken && to == aUsdcToken) || (from == aUsdcToken && to == usdcToken),
            "Usdc2AUsdcTokenExchange: Some token not compatible"
        );

        if (amount == 0) {
            return;
        }

        if (from == usdcToken && to == aUsdcToken) {
            //TODO: denominator usage
            uint256 denominator = 10**(18 - IERC20Metadata(address(usdcToken)).decimals());
            amount = amount / denominator;

            require(
                usdcToken.balanceOf(address(this)) >= amount,
                "Usdc2AUsdcTokenExchange: Not enough usdcToken"
            );

            usdcToken.transfer(address(aaveConnector), amount);
            aaveConnector.stake(address(usdcToken), amount, receiver);
        } else {
            //TODO: denominator usage
            uint256 denominator = 10**(18 - IERC20Metadata(address(aUsdcToken)).decimals());
            amount = amount / denominator;

            require(
                aUsdcToken.balanceOf(address(this)) >= amount,
                "Usdc2AUsdcTokenExchange: Not enough aUsdcToken"
            );

            aUsdcToken.transfer(address(aaveConnector), amount);
            uint256 withdrewAmount = aaveConnector.unstake(address(usdcToken), amount, receiver);

            //TODO: may be add some checks for withdrewAmount
        }
    }
}
