// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import { IAxelarExecutable } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarExecutable.sol';
import { IAxelarGateway } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol';
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/libs/AddressString.sol";

import "./TimelockControllerUpgradeable.sol";
import "./interfaces/IGnosisSafe.sol";

contract AgentTimelock is TimelockControllerUpgradeable, UUPSUpgradeable {


    /**
     * @dev Confidant MultiSig - allow to change protocol USD+
     * Can execute methods:
     * - schedule
     * - scheduleBatch

     * Members of MultiSig:
     * Can execute methods:
     * - cancel
     * - execute
     * - executeBatch
     */

    address public ovnAgent;

    /**
     * @dev Timelock to allow to change ovnAgent
     * If is it mother chain (Optimism)
     * then need to execute method: setOvnAgent()
     * if is it child chain (!Optimism)
     * then need to use Axelar Gateway
     */

    address public motherTimelock;
    string public motherChainId;
    IAxelarGateway public gateway;
    address public newImplementation;

    enum ActionOnAgent {
        SET_NEW_AGENT,
        UPGRADE_TIMELOCK
    }


    event OvnAgentUpdated(address ovnAgent);
    event NewImplementationUpdate(address newImplementation);


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _gateway,
                        address _motherTimelock,
                        address _ovnAgent,
                        string memory _motherChainId
    ) initializer public {
        require(_motherTimelock != address(0), "motherTimelock is zero");
        require(_ovnAgent != address(0), "ovnAgent is zero");
        require(bytes(_motherChainId).length != 0, "_motherChainId is empty");


        // If gateway is null then it's MOTHER Chain (Axelar disabled)
        // If gateway is defined then it's CHILD Chain (Axelar enabled)
        if(_gateway != address(0)){
            gateway = IAxelarGateway(_gateway);
        }

        motherTimelock = _motherTimelock;
        motherChainId = _motherChainId;
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
        return address(gateway) == address(0);
    }


    /**
     * @dev Allow to update ovnAgent or newImplementation by Axelar
     * How is it working?
     * MotherTimelock (Optimism) > send translation to Axelar -> Axelar Gateway execute it
     * Working only on CHILD Chain
     * @param payload - ['ActionOnAgent(uint256)', 'setAddress(address)']
     *
     * Available params:
     *
     * ActionOnAgent:
     *  0 - SET_NEW_AGENT
     *  1 -  UPGRADE_TIMELOCK
     * setAddress:
     * - Address a new OvnAgent
     * - Address a new implementation
     */

    function execute(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) external {
        require(!isMotherChain(), 'not motherChain');

        // Copy checks from AxelarGateway contracts
        require(msg.sender == address(gateway), "only gateway");
        bytes32 payloadHash = keccak256(payload);

        if (!gateway.validateContractCall(commandId, sourceChain, sourceAddress, payloadHash)){
            revert IAxelarExecutable.NotApprovedByGateway();
        }

        // Use Axelar library for convert from string to address type
        address source = StringToAddress.toAddress(sourceAddress);
        require(source == motherTimelock, 'only motherTimelock');

        // TODO How correct equal is it?
        require(keccak256(bytes(sourceChain)) == keccak256(bytes(motherChainId)), 'only motherChainId');

        // Support only certain actions
        // - Set a new ovnAgent
        // - Set newImplementation for upgradable

        (ActionOnAgent action, address setAddress) = abi.decode(payload, (ActionOnAgent, address));
        require(setAddress != address(0), 'setAddress is zero');

        if (action == ActionOnAgent.SET_NEW_AGENT) {
            ovnAgent = setAddress;
            emit OvnAgentUpdated(setAddress);
        } else if (action == ActionOnAgent.UPGRADE_TIMELOCK) {
            newImplementation = setAddress;
            emit NewImplementationUpdate(setAddress);
        } else {
            revert("Unknown action");
        }
    }


    /**
     * @dev Calling in modifier onlyAgent (see TimelockControllerUpgradeable)
     * Checks permissions for executing methods:
     * - schedule
     * - scheduleBatch
     */

    function _onlyAgent() override public {
        require(msg.sender == ovnAgent, "only ovnAgent");
    }


   /**
     * @dev Calling in modifier onlyAgentMembers (see TimelockControllerUpgradeable)
     * Checks permissions for executing methods:
     * - cancel
     * - execute
     * - executeBatch
     *
     * Allow calling methods only ovnAgent or members of ovnAgent
     */

    function _onlyAgentMembers() override public {
        bool isAllow = msg.sender == ovnAgent;

        if(!isAllow){

            address[] memory members = IGnosisSafe(ovnAgent).getOwners();
            for (uint256 i = 0; i < members.length; i++) {
                if(members[i] == msg.sender){
                    isAllow = true;
                    break;
                }
            }
        }
        require(isAllow, "only ovnAgent or ovnAgentMember");
    }
}
