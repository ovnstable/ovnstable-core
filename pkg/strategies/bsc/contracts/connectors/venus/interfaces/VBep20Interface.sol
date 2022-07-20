// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./VTokenInterface.sol";

abstract contract VBep20Interface {

    /**
     * @notice Underlying asset for this VToken
     */
    address public underlying;

    function mint(uint mintAmount) external virtual returns (uint);
    function mintBehalf(address receiver, uint mintAmount) external virtual returns (uint);
    function redeem(uint redeemTokens) external virtual returns (uint);
    function redeemUnderlying(uint redeemAmount) external virtual returns (uint);
    function borrow(uint borrowAmount) external virtual returns (uint);
    function repayBorrow(uint repayAmount) external virtual returns (uint);
    function repayBorrowBehalf(address borrower, uint repayAmount) external virtual returns (uint);
    function liquidateBorrow(address borrower, uint repayAmount, VTokenInterface vTokenCollateral) external virtual returns (uint);

}