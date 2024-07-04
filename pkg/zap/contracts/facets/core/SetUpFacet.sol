// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibCoreStorage} from "../../libraries/core/LibCoreStorage.sol";
import "../../interfaces/Modifiers.sol";

contract SetUpFacet is Modifiers {

    struct Args {
        address odosRouter;
        address npm;
        address roleManager;
    }

    function setCoreParams(Args memory args) external onlyAdmin {
        require(args.odosRouter != address(0), 'odosRouter is empty');
        require(args.npm != address(0), 'npm is empty');
        require(args.roleManager != address(0), 'roleManager is empty');

        LibCoreStorage.coreStorage().odosRouter = args.odosRouter;
        LibCoreStorage.coreStorage().npm = args.npm;
        LibCoreStorage.coreStorage().roleManager = args.roleManager;
    }

    function setSlippages(uint256 stakeSlippageBP) external onlyUnit {
        LibCoreStorage.coreStorage().stakeSlippageBP = stakeSlippageBP;
    }

    function stakeSlippageBP() external view returns (uint256) {
        return LibCoreStorage.coreStorage().stakeSlippageBP;
    }

    function odosRouter() external view returns (address) {
        return LibCoreStorage.coreStorage().odosRouter;
    }

    function npm() external view returns (address) {
        return LibCoreStorage.coreStorage().npm;
    }

    function roleManager() external view returns (address) {
        return LibCoreStorage.coreStorage().roleManager;
    }
}
