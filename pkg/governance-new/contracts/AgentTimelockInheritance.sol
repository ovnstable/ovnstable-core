// // SPDX-License-Identifier: MIT
// // OpenZeppelin Contracts (last updated v4.9.0) (governance/TimelockController.sol)

// pragma solidity ^0.8.0;

// // import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155ReceiverUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
// import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";


// import { AxelarExecutable } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol';
// import { IAxelarGateway } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol';
// import { IAxelarExecutable } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarExecutable.sol';
// import { IAxelarGasService } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol';
// import { IERC20 } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IERC20.sol';


// /**
//  * @dev Contract module which acts as a timelocked controller. When set as the
//  * owner of an `Ownable` smart contract, it enforces a timelock on all
//  * `onlyOwner` maintenance operations. This gives time for users of the
//  * controlled contract to exit before a potentially dangerous maintenance
//  * operation is applied.
//  *
//  * By default, this contract is self administered, meaning administration tasks
//  * have to go through the timelock process. The proposer (resp executor) role
//  * is in charge of proposing (resp executing) operations. A common use case is
//  * to position this {TimelockController} as the owner of a smart contract, with
//  * a multisig or a DAO as the sole proposer.
//  *
//  * _Available since v3.3._
//  */
// contract AgentTimelockInheritance is TimelockControllerUpgradeable, UUPSUpgradeable, IAxelarExecutable {
    
//     address public ovnAgent;
//     address public axelarGateway;
//     address public motherTimelock;
//     IAxelarGateway public gateway;

//     event OvnAgentUpdated(address ovnAgent);

//     function initialize(uint256 minDelay, address[] memory proposers, address[] memory executors, address admin, address _gateway) public initializer {
//         require(_gateway != address(0), "info");
//         TimelockControllerUpgradeable.__TimelockController_init(minDelay, proposers, executors, admin);
//         gateway = IAxelarGateway(_gateway);
//     }

//     function _isMotherChain() internal returns(bool) {
//         uint256 idChain;
//         assembly {
//             idChain := chainid()
//         }
//         return idChain == 10;
//     }

//     function setOvnAgent(
//         string memory _destinationChain,
//         string memory _destinationAddress,
//         address _ovnAgent
//     ) external {
//         require(_isMotherChain(), "info");
//         require(msg.sender == motherTimelock, "You are not a governor on mother chain");
//         require(_ovnAgent != address(0), "OVN Agent address is null");

//         if (keccak256(abi.encodePacked(_destinationChain)) == keccak256(abi.encodePacked("10"))) {
//             require(address(bytes20(bytes(_destinationAddress))) == address(this), "You want to send to another address");
//             require(_ovnAgent != address(0), "OVN Agent address is null");
//             ovnAgent = _ovnAgent;
//             emit OvnAgentUpdated(_ovnAgent);
//         } else {
//             bytes memory payload = abi.encode(_ovnAgent);
//             gateway.callContract(_destinationChain, _destinationAddress, payload);
//         }
//     }

//     function execute(
//         bytes32 commandId,
//         string calldata sourceChain,
//         string calldata sourceAddress,
//         bytes calldata payload
//     ) external {
//         bytes32 payloadHash = keccak256(payload);

//         if (!gateway.validateContractCall(commandId, sourceChain, sourceAddress, payloadHash))
//             revert NotApprovedByGateway();

//         require(msg.sender == axelarGateway, "You are not a governor on mother chain");
//         (address _ovnAgent) = abi.decode(payload, (address));
//         ovnAgent = _ovnAgent;
//         emit OvnAgentUpdated(_ovnAgent);
//     }

//     function executeWithToken(
//         bytes32 commandId,
//         string calldata sourceChain,
//         string calldata sourceAddress,
//         bytes calldata payload,
//         string calldata tokenSymbol,
//         uint256 amount
//     ) external {}

//     modifier onlyAgent() {
//         require(msg.sender == ovnAgent);
//         _;
//     }


//     function _authorizeUpgrade(address newImplementation)
//     internal
//     onlyAgent
//     override
//     {}



  

//     /**
//      * @dev Schedule an operation containing a single transaction.
//      *
//      * Emits {CallSalt} if salt is nonzero, and {CallScheduled}.
//      *
//      * Requirements:
//      *
//      * - the caller must have the 'proposer' role.
//      */
//     function schedule(
//         address target,
//         uint256 value,
//         bytes calldata data,
//         bytes32 predecessor,
//         bytes32 salt,
//         uint256 delay
//     ) public override onlyAgent {
//         bytes32 id = hashOperation(target, value, data, predecessor, salt);
//         // TimelockControllerUpgradeable._schedule(id, delay);
//         emit CallScheduled(id, 0, target, value, data, predecessor, delay);
//         if (salt != bytes32(0)) {
//             emit CallSalt(id, salt);
//         }
//     }

//     /**
//      * @dev Schedule an operation containing a batch of transactions.
//      *
//      * Emits {CallSalt} if salt is nonzero, and one {CallScheduled} event per transaction in the batch.
//      *
//      * Requirements:
//      *
//      * - the caller must have the 'proposer' role.
//      */
//     function scheduleBatch(
//         address[] calldata targets,
//         uint256[] calldata values,
//         bytes[] calldata payloads,
//         bytes32 predecessor,
//         bytes32 salt,
//         uint256 delay
//     ) public override onlyAgent {
//         require(targets.length == values.length, "TimelockController: length mismatch");
//         require(targets.length == payloads.length, "TimelockController: length mismatch");

//         bytes32 id = hashOperationBatch(targets, values, payloads, predecessor, salt);
//         // TimelockControllerUpgradeable._schedule(id, delay);
//         for (uint256 i = 0; i < targets.length; ++i) {
//             emit CallScheduled(id, i, targets[i], values[i], payloads[i], predecessor, delay);
//         }
//         if (salt != bytes32(0)) {
//             emit CallSalt(id, salt);
//         }
//     }

//     /**
//      * @dev Cancel an operation.
//      *
//      * Requirements:
//      *
//      * - the caller must have the 'canceller' role.
//      */
//     function cancel(bytes32 id) public override onlyAgent {
//         require(isOperationPending(id), "TimelockController: operation cannot be cancelled");
//         delete TimelockControllerUpgradeable._timestamps[id];

//         emit Cancelled(id);
//     }

//     /**
//      * @dev Execute an (ready) operation containing a single transaction.
//      *
//      * Emits a {CallExecuted} event.
//      *
//      * Requirements:
//      *
//      * - the caller must have the 'executor' role.
//      */
//     // This function can reenter, but it doesn't pose a risk because _afterCall checks that the proposal is pending,
//     // thus any modifications to the operation during reentrancy should be caught.
//     // slither-disable-next-line reentrancy-eth
//     function execute(
//         address target,
//         uint256 value,
//         bytes calldata payload,
//         bytes32 predecessor,
//         bytes32 salt
//     ) public payable override onlyAgent {
//         bytes32 id = hashOperation(target, value, payload, predecessor, salt);

//         TimelockControllerUpgradeable._beforeCall(id, predecessor);
//         TimelockControllerUpgradeable._execute(target, value, payload);
//         emit CallExecuted(id, 0, target, value, payload);
//         TimelockControllerUpgradeable._afterCall(id);
//     }

//     /**
//      * @dev Execute an (ready) operation containing a batch of transactions.
//      *
//      * Emits one {CallExecuted} event per transaction in the batch.
//      *
//      * Requirements:
//      *
//      * - the caller must have the 'executor' role.
//      */
//     // This function can reenter, but it doesn't pose a risk because _afterCall checks that the proposal is pending,
//     // thus any modifications to the operation during reentrancy should be caught.
//     // slither-disable-next-line reentrancy-eth
//     function executeBatch(
//         address[] calldata targets,
//         uint256[] calldata values,
//         bytes[] calldata payloads,
//         bytes32 predecessor,
//         bytes32 salt
//     ) public payable override onlyAgent {
//         require(targets.length == values.length, "TimelockController: length mismatch");
//         require(targets.length == payloads.length, "TimelockController: length mismatch");

//         bytes32 id = hashOperationBatch(targets, values, payloads, predecessor, salt);

//         TimelockControllerUpgradeable._beforeCall(id, predecessor);
//         for (uint256 i = 0; i < targets.length; ++i) {
//             address target = targets[i];
//             uint256 value = values[i];
//             bytes calldata payload = payloads[i];
//             TimelockControllerUpgradeable._execute(target, value, payload);
//             emit CallExecuted(id, i, target, value, payload);
//         }
//         TimelockControllerUpgradeable._afterCall(id);
//     }


//     uint256[48] private __gap;
// }
