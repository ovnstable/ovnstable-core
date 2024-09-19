// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/core/LibCoreStorage.sol";
import "../../interfaces/Modifiers.sol";

contract SetUpFacet is Modifiers {
    struct Args {
        address odosRouter;
        address npm;
        uint256 slippageBps;
        uint256 binSearchIterations;
    }

    function setCoreParams(Args memory args) external onlyAdmin {
        require(args.odosRouter != address(0), 'odosRouter is empty');
        require(args.npm != address(0), 'npm is empty');

        LibCoreStorage.coreStorage().odosRouter = args.odosRouter;
        LibCoreStorage.coreStorage().npm = args.npm;
        LibCoreStorage.coreStorage().slippageBps = args.slippageBps;
        LibCoreStorage.coreStorage().binSearchIterations = args.binSearchIterations;
    }

    function setMasterChefV3(address _masterChefV3) external onlyAdmin {
        require(_masterChefV3 != address(0), 'masterChefV3 is empty');
        LibCoreStorage.coreStorage().masterChefV3 = _masterChefV3;
    }

    function odosRouter() external view returns (address) {
        return LibCoreStorage.coreStorage().odosRouter;
    }

    function npm() external view returns (address) {
        return LibCoreStorage.coreStorage().npm;
    }

    function slippageBps() external view returns (uint256) {
        return LibCoreStorage.coreStorage().slippageBps;
    }

    function binSearchIterations() external view returns (uint256) {
        return LibCoreStorage.coreStorage().binSearchIterations;
    }

    function masterChefV3() external view returns (address) {
        return LibCoreStorage.coreStorage().masterChefV3;
    }
}
