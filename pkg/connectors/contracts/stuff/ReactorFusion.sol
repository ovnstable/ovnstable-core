// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IRFComptroller {
    function enterMarkets(address[] calldata cTokens) external returns (uint[] memory);
    function exitMarket(address cToken) external returns (uint);
}

interface IRFToken {
    function balanceOf(address owner) external view returns (uint);
    function exchangeRateStored() external view returns (uint);
    function borrowBalanceStored(address account) external view returns (uint);
    function mint(uint mintAmount) external returns (uint);
    function redeem(uint redeemTokens) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function borrow(uint borrowAmount) external returns (uint);
    function repayBorrow(uint repayAmount) external returns (uint);
    function repayBorrowBehalf(address borrower, uint repayAmount) external returns (uint);
    function accrueInterest() external returns (uint);
}

interface IRFRewardsDistributor {
    function borrowSlot(address cToken) external pure returns (bytes32);
    function supplySlot(address cToken) external pure returns (bytes32);
    function harvest(bytes32[] memory ledgerIds) external returns (uint256);
}