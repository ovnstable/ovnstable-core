// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/// @title Common inrterface to DeFi protocol connectors
/// @author @Stanta
/// @notice Every connector have to implement this function
/// @dev Choosing of connector releasing by changing address of connector's contract
interface IConnector {

    event EventStake(string label, uint256 amountIn, uint256 amountOut);
    event EventUnStake(string label, uint256 amountIn, uint256 amountOut);
    event BusinessEvent(string label, uint256 beforeAmount, uint256 afterAmount);

    function stake(address _asset, address _pool, uint256 _amount, address _beneficiar) external;

    function unstake(address _asset, address _pool, uint256 _amount, address _to) external returns (uint256);

    function getPriceOffer(address _asset, address _pool) external view returns (uint256);

    function getBookValue(address _asset, address _addrWault, address _pool) external view returns (uint256);

    function getLiqValue(address _asset, address _addrWault, address _pool) external view returns (uint256);

}
