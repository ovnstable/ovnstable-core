// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IGnosisSafe.sol";
import { IAxelarExecutable } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarExecutable.sol';
import { IAxelarGateway } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol';
import "./TimelockControllerUpgradeable.sol";


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


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _gateway, address _motherTimelock, address _ovnAgent) initializer public {
        require(_gateway != address(0), "gateway is zero");
        require(_motherTimelock != address(0), "motherTimelock is zero");
        require(_ovnAgent != address(0), "ovnAgent is zero");

        gateway = IAxelarGateway(_gateway);
        motherTimelock = _motherTimelock;
        ovnAgent = _ovnAgent;

        __UUPSUpgradeable_init();

    }


    function _authorizeUpgrade(address _newImplementation)
    internal
    onlyAgentMembers
    override
    {

        if(newImplementation == address(0)){
            newImplementation = _newImplementation;
        }else{
            // Mother governance should set a new address newImplementation by proposal
            // Agent Member execute upgradeTo on contract pass implementation address equal newImplementation
            require(newImplementation == _newImplementation, 'New implementation not equal');
        }
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
        require(msg.sender == address(gateway), "only gateway");
        bytes32 payloadHash = keccak256(payload);

        if (!gateway.validateContractCall(commandId, sourceChain, sourceAddress, payloadHash))
            revert IAxelarExecutable.NotApprovedByGateway();

        // Support only certain actions
        // - Set a new ovnAgent
        // - Set newImplementation for upgradable

        (ActionOnAgent action, address _address) = abi.decode(payload, (ActionOnAgent, address));
        require(_address != address(0), '_address is zero');

        if (action == ActionOnAgent.SET_NEW_AGENT) {
            ovnAgent = _address;
            emit OvnAgentUpdated(_address);
        } else if (action == ActionOnAgent.UPGRADE_TIMELOCK) {
            newImplementation = _address;
            emit NewImplementationUpdate(_address);
        } else {
            revert("Unknown action");
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


    function _onlyAgent() override public {
        require(msg.sender == ovnAgent, "only ovnAgent");
    }

    function _onlyAgentMembers() override public {
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
    }
}
