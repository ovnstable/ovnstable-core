// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
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
            "Some token not compatible"
        );

        if (from == usdcToken && to == aUsdcToken) {
            usdcToken.transfer(address(aaveConnector), amount);
            aaveConnector.stake(address(usdcToken), amount, receiver);
        } else {
            aUsdcToken.transfer(address(aaveConnector), amount);
            uint256 withdrewAmount = aaveConnector.unstake(address(usdcToken), amount, receiver);

            //TODO: may be add some checks for withdrewAmount
        }
    }
}
