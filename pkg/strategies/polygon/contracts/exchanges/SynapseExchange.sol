// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../connectors/synapse/interfaces/ISwap.sol";

abstract contract SynapseExchange {

    ISwap private synapseSwap;

    function _setSynapseSwap(
        address _synapseSwap
    ) internal {
        synapseSwap = ISwap(synapseSwap);
    }

    function _synapseCalculateSwap(
        uint8 tokenIndexFrom,
        uint8 tokenIndexTo,
        uint256 dx
    ) internal view returns (uint256) {
        return synapseSwap.calculateSwap(tokenIndexFrom, tokenIndexTo, dx);
    }

    function _synapseSwap(
        uint8 tokenIndexFrom,
        uint8 tokenIndexTo,
        uint256 dx
    ) internal returns (uint256) {
        uint256 minDy = synapseSwap.calculateSwap(tokenIndexFrom, tokenIndexTo, dx);
        return synapseSwap.swap(tokenIndexFrom, tokenIndexTo, dx, minDy, block.timestamp);
    }

}
