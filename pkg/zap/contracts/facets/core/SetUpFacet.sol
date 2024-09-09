// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/core/LibCoreStorage.sol";
import "../../interfaces/Modifiers.sol";

contract SetUpFacet is Modifiers {
    struct Args {
        address odosRouter;
        address npm;
    }

    function setCoreParams(Args memory args) external onlyAdmin {
        require(args.odosRouter != address(0), 'odosRouter is empty');
        require(args.npm != address(0), 'npm is empty');

        LibCoreStorage.coreStorage().odosRouter = args.odosRouter;
        LibCoreStorage.coreStorage().npm = args.npm;
    }

    function setSlippages(uint256 stakeSlippage) external onlyAdmin {
        LibCoreStorage.coreStorage().stakeSlippageBP = stakeSlippage;
    }

    function setMaxSwaps(uint256 stakeSlippage) external onlyAdmin {
        LibCoreStorage.coreStorage().stakeSlippageBP = stakeSlippage;
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
}
