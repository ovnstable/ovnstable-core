// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface Unitroller {
    function enterMarkets(address[] calldata cTokens) external returns (uint[] memory);
    function exitMarket(address cToken) external returns (uint);
    function claimComp(address holder, CToken[] memory cTokens) external;
    function markets(address ctoken) external view returns ( bool, uint256, bool );
    function getAccountLiquidity(address account) external view returns (uint, uint256, uint);
}

interface CToken {
    function balanceOf(address owner) external view returns (uint);
    function comptroller() external view returns (address);
    function getAccountSnapshot(address account) external view returns (uint, uint, uint,uint);
    function exchangeRateStored() external view returns (uint);
    function borrowBalanceStored(address account) external view returns (uint);
    function balanceOfUnderlying(address account) external view returns (uint);
    function mint(uint mintAmount) external returns (uint);
    function redeem(uint redeemTokens) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function borrow(uint borrowAmount) external returns (uint);
    function repayBorrow(uint repayAmount) external returns (uint);
    function repayBorrowBehalf(address borrower, uint repayAmount) external returns (uint);
    function accrueInterest() external returns (uint);
}
