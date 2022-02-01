// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../interfaces/ITokenExchange.sol";
import "../connectors/balancer/interfaces/IVault.sol";
import "../connectors/balancer/interfaces/IAsset.sol";

contract Bal2UsdcTokenExchange is ITokenExchange {

    IVault public balancerVault;
    IERC20 public usdcToken;
    IERC20 public balToken;
    bytes32 public balancerPoolId;

    constructor(
        address _balancerVault,
        address _usdcToken,
        address _balToken,
        bytes32 _balancerPoolId
    ) {
        require(_balancerVault != address(0), "Zero address not allowed");
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_balToken != address(0), "Zero address not allowed");
        require(_balancerPoolId != "", "Empty pool id not allowed");

        balancerVault = IVault(_balancerVault);
        usdcToken = IERC20(_usdcToken);
        balToken = IERC20(_balToken);
        balancerPoolId = _balancerPoolId;
    }

    function exchange(
        address spender,
        IERC20 from,
        address receiver,
        IERC20 to,
        uint256 amount
    ) external override {
        require(
            (from == usdcToken && to == balToken) || (from == balToken && to == usdcToken),
            "Bal2UsdcTokenExchange: Some token not compatible"
        );

        if (amount == 0) {
            from.transfer(spender, from.balanceOf(address(this)));
            return;
        }

        if (from == usdcToken && to == balToken) {
            revert("Bal2UsdcTokenExchange: Allowed only exchange bal to USDC");
        } else {
            //TODO: denominator usage
            uint256 denominator = 10 ** (18 - IERC20Metadata(address(balToken)).decimals());
            amount = amount / denominator;

            require(
                balToken.balanceOf(address(this)) >= amount,
                "Bal2UsdcTokenExchange: Not enough balToken"
            );

            // check after denormilization
            if (amount == 0) {
                from.transfer(spender, from.balanceOf(address(this)));
                return;
            }

            balToken.approve(address(balancerVault), amount);

            IVault.SingleSwap memory singleSwap;
            singleSwap.poolId = balancerPoolId;
            singleSwap.kind = IVault.SwapKind.GIVEN_IN;
            singleSwap.assetIn = IAsset(address(balToken));
            singleSwap.assetOut = IAsset(address(usdcToken));
            singleSwap.amount = amount;

            IVault.FundManagement memory fundManagement;
            fundManagement.sender = address(this);
            fundManagement.fromInternalBalance = false;
            fundManagement.recipient = payable(receiver);
            fundManagement.toInternalBalance = false;

            balancerVault.swap(singleSwap, fundManagement, 10 ** 27, block.timestamp + 600);
        }
    }
}
