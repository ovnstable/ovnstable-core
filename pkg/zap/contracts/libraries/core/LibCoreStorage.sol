// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library LibCoreStorage {
    bytes32 internal constant CORE_STORAGE_POSITION = keccak256("core.storage");

    struct CoreStorage {
        address odosRouter;
        address npm;
        uint256 stakeSlippageBP;
        address diamond;
        uint256 maxSwapIterations;
    }

    function coreStorage() internal pure returns (CoreStorage storage ds) {
        bytes32 position = CORE_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }
}
