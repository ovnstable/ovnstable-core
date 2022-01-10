// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../interfaces/ITokenExchange.sol";
import "../connectors/balancer/interfaces/IVault.sol";

contract Mta2UsdcTokenExchange is ITokenExchange {

    IVault public balancerVault;
    IERC20 public usdcToken;
    IERC20 public mtaToken;

    constructor(
        address _balancerVault,
        address _usdcToken,
        address _mtaToken
    ) {
        require(_balancerVault != address(0), "Zero address not allowed");
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_mtaToken != address(0), "Zero address not allowed");

        balancerVault = IVault(_balancerVault);
        usdcToken = IERC20(_usdcToken);
        mtaToken = IERC20(_mtaToken);
    }

    function exchange(
        address spender,
        IERC20 from,
        address receiver,
        IERC20 to,
        uint256 amount
    ) external override {
        //TODO mstable
        require(
            (from == usdcToken && to == mtaToken) || (from == mtaToken && to == usdcToken),
            "Mta2UsdcTokenExchange: Some token not compatible"
        );

        if (amount == 0) {
            from.transfer(spender, from.balanceOf(address(this)));
            return;
        }

        if (from == usdcToken && to == mtaToken) {
            revert("Mta2UsdcTokenExchange: Allowed only exchange mta to USDC");
        } else {
            //TODO: denominator usage
            uint256 denominator = 10**(18 - IERC20Metadata(address(mtaToken)).decimals());
            amount = amount / denominator;

            require(
                mtaToken.balanceOf(address(this)) >= amount,
                "Mta2UsdcTokenExchange: Not enough mtaToken"
            );

            // check after denormilization
            if (amount == 0) {
                from.transfer(spender, from.balanceOf(address(this)));
                return;
            }

            address[] memory path = new address[](2);
            path[0] = address(mtaToken);
            path[1] = address(usdcToken);

//            uint[] memory amountsOut = balancerVault.getAmountsOut(amount, path);
//            // 6 + 18 - 18 = 6 - not normilized USDC in native 6 decimals
//            uint256 estimateUsdcOut = (amountsOut[1] * (10**18)) / amountsOut[0];
//            // skip exchange if estimate USDC less than 3 shares to prevent INSUFFICIENT_OUTPUT_AMOUNT error
//            // TODO: may be enough 2 or insert check ratio IN/OUT to make decision
//            if (estimateUsdcOut < 3) {
//                from.transfer(spender, from.balanceOf(address(this)));
//                return;
//            }
//
//            mtaToken.approve(address(balancerVault), amount);

            // TODO: use some calculation or Oracle call instead of usage '0' as amountOutMin
//            balancerVault.swapExactTokensForTokens(
//                amount, //    uint amountIn,
//                0, //          uint amountOutMin,
//                path,
//                receiver,
//                block.timestamp + 600 // 10 mins
//            );
        }
    }
}
