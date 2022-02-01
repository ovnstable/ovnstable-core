// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../interfaces/ITokenExchange.sol";
import "../connectors/balancer/interfaces/IVault.sol";
import "../connectors/balancer/interfaces/IAsset.sol";

contract TUsd2UsdcTokenExchange is ITokenExchange {

    IVault public balancerVault;
    IERC20 public usdcToken;
    IERC20 public tUsdToken;
    bytes32 public balancerPoolId;

    constructor(
        address _balancerVault,
        address _usdcToken,
        address _tUsdToken,
        bytes32 _balancerPoolId
    ) {
        require(_balancerVault != address(0), "Zero address not allowed");
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_tUsdToken != address(0), "Zero address not allowed");
        require(_balancerPoolId != "", "Empty pool id not allowed");

        balancerVault = IVault(_balancerVault);
        usdcToken = IERC20(_usdcToken);
        tUsdToken = IERC20(_tUsdToken);
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
            (from == usdcToken && to == tUsdToken) || (from == tUsdToken && to == usdcToken),
            "TUsd2UsdcTokenExchange: Some token not compatible"
        );

        if (amount == 0) {
            from.transfer(spender, from.balanceOf(address(this)));
            return;
        }

        if (from == usdcToken && to == tUsdToken) {
            revert("TUsd2UsdcTokenExchange: Allowed only exchange tUsd to USDC");
        } else {
            //TODO: denominator usage
            uint256 denominator = 10 ** (18 - IERC20Metadata(address(tUsdToken)).decimals());
            amount = amount / denominator;

            require(
                tUsdToken.balanceOf(address(this)) >= amount,
                "TUsd2UsdcTokenExchange: Not enough tUsdToken"
            );

            // check after denormilization
            if (amount == 0) {
                from.transfer(spender, from.balanceOf(address(this)));
                return;
            }

            tUsdToken.approve(address(balancerVault), amount);

            IVault.SingleSwap memory singleSwap;
            singleSwap.poolId = balancerPoolId;
            singleSwap.kind = IVault.SwapKind.GIVEN_IN;
            singleSwap.assetIn = IAsset(address(tUsdToken));
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
