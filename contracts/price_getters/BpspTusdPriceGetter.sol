// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../price_getters/AbstractPriceGetter.sol";
import "../connectors/balancer/interfaces/IVault.sol";

contract BpspTusdPriceGetter is AbstractPriceGetter, Ownable {

    IVault public balancerVault;

    function setBalancerVault(address _balancerVault) public onlyOwner {
        require(_balancerVault != address(0), "Zero address not allowed");
        balancerVault = IVault(_balancerVault);
    }

    function getUsdcBuyPrice() external view override returns (uint256) {
        //TODO balancer
        return 0;
    }

    function getUsdcSellPrice() external view override returns (uint256) {
        //TODO balancer
        return 0;
    }
}
