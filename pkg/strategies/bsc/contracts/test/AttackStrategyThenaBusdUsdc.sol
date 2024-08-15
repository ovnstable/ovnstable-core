// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Thena.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombat.sol";

import "hardhat/console.sol";

contract AttackStrategyThenaBusdUsdc {

    // --- structs

    struct StrategyParams {
        address busd;
        address usdc;
        address pair;
        address router;
    }

    // --- params

    IERC20 public busd;
    IERC20 public usdc;

    IPair public pair;
    IRouter public router;

    // --- events

    event StrategyUpdatedParams();

    // ---  constructor

    constructor() {}

    // --- Setters

    function setParams(StrategyParams calldata params) external {
        busd = IERC20(params.busd);
        usdc = IERC20(params.usdc);

        pair = IPair(params.pair);
        router = IRouter(params.router);

        emit StrategyUpdatedParams();
    }

    // --- logic

    function attack(
        address _asset,
        uint256 amount,
        uint256 index
    ) external {

        _showBalances('Before swap 50kk');

        // swap busd to usdc
        ThenaLibrary.swap(
            router,
            address(usdc),
            address(busd),
            true,
            usdc.balanceOf(address(this)),
            0,
            address(this)
        );

        _showBalances('After swap 50kk');
    }

    function _showBalances(string memory step) internal {
        console.log(step);
        console.log('Balances pool:');
        console.log("- USDC:  %s", pair.reserve0() / 1e18);
        console.log("- BUSD:  %s", pair.reserve1() / 1e18);
    }
}
