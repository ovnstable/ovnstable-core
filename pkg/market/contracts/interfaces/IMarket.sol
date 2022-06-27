pragma solidity ^0.8.0;

interface IMarket {

    function wrap(
        address asset,
        uint256 amount,
        address receiver
    ) external;

    function unwrap(
        address asset,
        uint256 amount,
        address receiver
    ) external;
}
