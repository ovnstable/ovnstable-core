// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";

contract MockPriceFeed is IPriceFeed {


    int256 public price;

    function setPrice(int256 _price) public {
        price = _price;
    }

    function latestAnswer() external view returns (int256){
        return 0;
    }

    function latestTimestamp() external view returns (uint256){
        return block.timestamp;
    }

    function latestRound() external view returns (uint256){
        return 0;
    }

    function getAnswer(uint256 roundId) external view returns (int256){
        return 0;
    }

    function getTimestamp(uint256 roundId) external view returns (uint256){
        return 0;
    }

    function decimals() external view returns (uint8){
        return 0;
    }

    function description() external view returns (string memory){
        return 'test';
    }

    function version() external view returns (uint256){
        return 0;
    }

    // getRoundData and latestRoundData should both raise "No data present"
    // if they do not have data to report, instead of returning unset values
    // which could be misinterpreted as actual reported values.
    function getRoundData(uint80 _roundId)
    external
    view
    returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ){
        answer = price;
        updatedAt = block.timestamp;
    }

    function latestRoundData()
    external
    view
    returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ){
        answer = price;
        updatedAt = block.timestamp;
    }
}
