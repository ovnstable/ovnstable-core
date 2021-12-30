// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../price_getters/AbstractPriceGetter.sol";
import "../connectors/balancer/interfaces/IVault.sol";

contract MtaPriceGetter is AbstractPriceGetter {

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

    function getUsdcBuyPrice() external view override returns (uint256) {
        //TODO mstable
        return 0;
    }

    function getUsdcSellPrice() external view override returns (uint256) {
        return 0;
    }
}
