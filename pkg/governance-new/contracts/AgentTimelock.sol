// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IGnosisSafe.sol";
import { IAxelarExecutable } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarExecutable.sol';
import { IAxelarGateway } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol';


contract AgentTimelock is TimelockControllerUpgradeable, UUPSUpgradeable{

    uint256 public constant MOTHER_CHAIN_ID = 10; // Optimism
    string public constant MOTHER_CHAIN_ID_STR = "10"; // Optimism

    /**
     * @dev Confidant MultiSig - allow to change protocol USD+
     * Can execute methods:
     * - execute
     * - executeBatch
     */

    address public ovnAgent;


    address public motherTimelock; // mother timelock address, exist only on motherChain
    IAxelarGateway public gateway;
    address public newImplementation;

    enum ActionOnAgent {
        UPGRADE_TIMELOCK,
        SET_NEW_AGENT
    }


    event OvnAgentUpdated(address ovnAgent);
    event NewImplementationUpdate(address newImplementation);

    modifier onlyAgent() {
        require(msg.sender == ovnAgent);
        _;
    }

    modifier onlyAgentMembers() {
        bool exist = msg.sender == ovnAgent;

        if(!exist){

            address[] memory members = IGnosisSafe(ovnAgent).getOwners();
            for (uint256 i = 0; i < members.length; i++) {
                if(members[i] == msg.sender){
                    exist = true;
                    break;
                }
            }
        }
        require(exist, "only ovnAgent or ovnAgentMember");
        _;
    }


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _gateway, address _motherTimelock) initializer public {
        require(_gateway != address(0), "Gateway address shouldn't be zero");
        require(_motherTimelock != address(0), "Mother timelock address shouldn't be zero");

        __UUPSUpgradeable_init();

        gateway = IAxelarGateway(_gateway);
        motherTimelock = _motherTimelock;

    }


    function _authorizeUpgrade(address _newImplementation)
    internal
    onlyAgentMembers
    override
    {
        // Mother governance should set a new address newImplementation by proposal
        // Agent Member execute upgradeTo on contract pass implementation address equal newImplementation
        require(newImplementation == _newImplementation, 'New implementation not equal');
    }


    function isMotherChain() public view returns(bool) {
        uint256 idChain;
        assembly {
            idChain := chainid()
        }
        return idChain == MOTHER_CHAIN_ID;
    }



    function execute(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) external {

        // Copy checks from AxelarGateway contracts
        require(msg.sender == address(gateway), "Sender should be only axelarGateway");
        bytes32 payloadHash = keccak256(payload);

        if (!gateway.validateContractCall(commandId, sourceChain, sourceAddress, payloadHash))
            revert IAxelarExecutable.NotApprovedByGateway();

        // Support only certain actions
        // - Set a new ovnAgent
        // - Set newImplementation for upgradable

        (ActionOnAgent action, address _address) = abi.decode(payload, (ActionOnAgent, address));
        if (action == ActionOnAgent.SET_NEW_AGENT) {
            ovnAgent = _address;
            emit OvnAgentUpdated(_address);
        } else if (action == ActionOnAgent.UPGRADE_TIMELOCK) {
            newImplementation = _address;
            emit NewImplementationUpdate(_address);
        } else {
            revert("Inappropriate action");
        }
    }

    function executeWithToken(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload,
        string calldata tokenSymbol,
        uint256 amount
    ) external {
        // only accepts tokens
    }

    // OpenZeppelin Timelock methods
    // Change list:
    // - Add onlyAgent or onlyAgentMembers modifiers

    function schedule(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay
    ) public override onlyAgent {
        super.schedule(target, value, data, predecessor, salt, delay);
    }

    function scheduleBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata payloads,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay
    ) public override onlyAgent {
        super.scheduleBatch(targets, values, payloads, predecessor, salt, delay);
    }

    function execute(
        address target,
        uint256 value,
        bytes calldata payload,
        bytes32 predecessor,
        bytes32 salt
    ) public payable override onlyAgentMembers {
        super.execute(target, value, payload, predecessor, salt);
    }

    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata payloads,
        bytes32 predecessor,
        bytes32 salt
    ) public payable override onlyAgentMembers {
       super.executeBatch(targets, values, payloads, predecessor, salt);
    }

    function cancel(bytes32 id) public override onlyAgentMembers  {
        super.cancel(id);
    }
}
