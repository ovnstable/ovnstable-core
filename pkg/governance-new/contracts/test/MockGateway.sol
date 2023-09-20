// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.8;

import { IAxelarExecutable } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarExecutable.sol';


contract MockGateway {

    bool public validate;

    function setValidate(bool _value) external {
        validate = _value;
    }

    function validateContractCall(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes32 payloadHash
    ) external returns (bool){
        return validate;
    }

    function send(bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload,
        address to) public {

        IAxelarExecutable(to).execute(commandId, sourceChain, sourceAddress, payload);
    }
}
