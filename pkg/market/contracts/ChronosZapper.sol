// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./OdosWrapper.sol";

contract ChronosZapper is OdosWrapper{


    address public router;

    struct StakeData {
        address gauge;
    }

    function zapIn(SwapData memory swapData, StakeData memory stakeData) external {


        _swap(swapData);

        addLiquidity();
        stakeToGauge();

    }


    function getProportion(address pair) view returns (uint256 token0, uint256 token1){


    }
}
