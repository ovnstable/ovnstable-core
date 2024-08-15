// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IWETH {
    function deposit() external payable;
    function withdraw(uint wad) external;
}

interface IToken {
    function balanceOf(address _account) external view returns (uint256);
    function exchangeRateStored() external view returns (uint256);
    function borrowBalanceStored(address _account) external view returns (uint256);
    function mint(address _recipient, uint256 _mintAmount) external payable;
    function redeem(address _from, uint256 _redeemiToken) external;
    function redeemUnderlying(address _from, uint256 _redeemUnderlying) external;
    function borrow(uint256 _borrowAmount) external;
    function repayBorrow(uint256 _repayAmount) external payable;
    function repayBorrowBehalf(address _borrower, uint256 _repayAmount) external payable;
    function repayBorrow() external payable;
    function repayBorrowBehalf(address _borrower) external payable;
    function updateInterest() external returns (bool);
}

interface IController {
    function enterMarkets(address[] calldata _iTokens) external returns (bool[] memory _results);
    function exitMarkets(address[] calldata _iTokens) external returns (bool[] memory _results);
}

interface IRewardDistributor {
    function claimRewards(
        address[] memory _holders,
        address[] memory _suppliediTokens,
        address[] memory _borrowediTokens
    ) external;
}