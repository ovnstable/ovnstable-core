// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

library OvnMath {

    function abs(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x > y) ? (x - y) : (y - x);
    }

    function addBasisPoints(uint256 amount, uint256 basisPoints, uint256 basisDenominator) internal pure returns (uint256) {
        return amount * (basisDenominator + basisPoints) / basisDenominator;
    }

    function reverseAddBasisPoints(uint256 amount, uint256 basisPoints, uint256 basisDenominator) internal pure returns (uint256) {
        return amount * basisDenominator / (basisDenominator + basisPoints);
    }

    function subBasisPoints(uint256 amount, uint256 basisPoints, uint256 basisDenominator) internal pure returns (uint256) {
        return amount * (basisDenominator - basisPoints) / basisDenominator;
    }

    function reverseSubBasisPoints(uint256 amount, uint256 basisPoints, uint256 basisDenominator) internal pure returns (uint256) {
        return amount * basisDenominator / (basisDenominator - basisPoints);
    }
}
