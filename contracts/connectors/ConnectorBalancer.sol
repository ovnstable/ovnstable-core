// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "../interfaces/IConnector.sol";
import "./balancer/interfaces/IVault.sol";
import "./balancer/interfaces/IAsset.sol";

contract ConnectorBalancer is IConnector, Ownable {

    IVault public balancerVault;
    bytes32 public balancerPoolId;

    function setBalancerVault(address _balancerVault) public onlyOwner {
        require(_balancerVault != address(0), "Zero address not allowed");
        balancerVault = IVault(_balancerVault);
    }

    function setBalancerPoolId(bytes32 _balancerPoolId) public onlyOwner {
        require(_balancerPoolId != "", "Empty pool id not allowed");
        balancerPoolId = _balancerPoolId;
    }

    function stake(
        address _asset,
        uint256 _amount,
        address _beneficiar
    ) public override {
        IERC20(_asset).approve(address(balancerVault), _amount);

        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(balancerPoolId);

        IAsset[] memory assets = new IAsset[](4);
        uint256[] memory maxAmountsIn = new uint256[](4);
        uint256[] memory amountsIn = new uint256[](4);
        for (uint256 i; i < tokens.length; i++) {
            assets[i] = IAsset(address(tokens[i]));
            if (address(tokens[i]) == _asset) {
                maxAmountsIn[i] = _amount;
                amountsIn[i] = _amount;
            } else {
                maxAmountsIn[i] = 0;
                amountsIn[i] = 0;
            }
        }

        uint256 joinKind = 1;
        uint256 minimumBPT = 0;
        bytes memory userData = abi.encode(joinKind, amountsIn, minimumBPT);

        IVault.JoinPoolRequest memory request = IVault.JoinPoolRequest(assets, maxAmountsIn, userData, false);

        balancerVault.joinPool(balancerPoolId, address(this), _beneficiar, request);
    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiar
    ) public override returns (uint256) {
        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(balancerPoolId);

        IAsset[] memory assets = new IAsset[](4);
        uint256[] memory minAmountsOut = new uint256[](4);
        for (uint256 i; i < tokens.length; i++) {
            assets[i] = IAsset(address(tokens[i]));
            if (address(tokens[i]) == _asset) {
                //TODO: Balancer. FIX if big slippage
                uint256 denominator = 10 ** (18 - IERC20Metadata(address(_asset)).decimals());
                minAmountsOut[i] = _amount / denominator * 9 / 10;
            } else {
                minAmountsOut[i] = 0;
            }
        }

        uint256 exitKind = 0;
        uint256 exitTokenIndex = 0;
        bytes memory userData = abi.encode(exitKind, _amount, exitTokenIndex);

        IVault.ExitPoolRequest memory request = IVault.ExitPoolRequest(assets, minAmountsOut, userData, false);

        balancerVault.exitPool(balancerPoolId, address(this), payable(_beneficiar), request);
        return IERC20(_asset).balanceOf(_beneficiar);
    }
}
