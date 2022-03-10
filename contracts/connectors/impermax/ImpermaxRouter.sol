// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0 <0.9.0;

interface ImpermaxRouter {


    function mint(address poolToken, uint256 amount, address to, uint256 deadline) external;

    function redeem(address poolToken, uint256 tokens, address to, uint256 deadline, bytes memory permitData) external;

    function getUniswapV2Pair(address underlying) external view returns (address);
    function getBorrowable(address uniswapV2Pair, uint8 index) external view returns (address borrowable);
    function getCollateral(address uniswapV2Pair) external view returns (address collateral);
    function getLendingPool(address uniswapV2Pair) external view returns (address collateral, address borrowableA, address borrowableB);

}
