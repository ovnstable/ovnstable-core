// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { IAxelarExecutable } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarExecutable.sol';
import { IAxelarGateway } from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol';
import "@axelar-network/axelar-gmp-sdk-solidity/contracts/libs/AddressString.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import "./interfaces/IPayoutManager.sol";
import "./interfaces/IUsdPlusToken.sol";

contract Exchange2 is Initializable, AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable {
    uint256 public constant LIQ_DELTA_DM = 1e6;

    IAxelarGateway public gateway;
    address motherSource;
    string motherChainId;

    event PayoutShortEvent(
        address usdPlus,
        uint256 newDelta,
        uint256 nonRebaseDelta
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _gateway, address _motherSource, string memory _motherChainId) initializer public {
        require(_gateway != address(0), "_gateway is zero");
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        gateway = IAxelarGateway(_gateway);
        motherSource = _motherSource;
        motherChainId = _motherChainId;
    }

    function _authorizeUpgrade(address newImplementation) internal onlyRole(DEFAULT_ADMIN_ROLE) override {}

    function execute(bytes32 commandId, string calldata sourceChain, string calldata sourceAddress, bytes calldata payload) external {

        bytes32 payloadHash = keccak256(payload);
        if (!gateway.validateContractCall(commandId, sourceChain, sourceAddress, payloadHash)){
            revert IAxelarExecutable.NotApprovedByGateway();
        }

        address source = StringToAddress.toAddress(sourceAddress);
        require(source == motherSource, 'only mother source');
        require(keccak256(bytes(sourceChain)) == keccak256(bytes(motherChainId)), 'only motherChainId');

        (address usdPlus, address payoutManager, uint256 newDelta) = abi.decode(payload, (address, address, uint256));

        require(newDelta > LIQ_DELTA_DM, "Negative rebase");
        require(payoutManager != address(0), "Need to specify payoutManager address");

        IUsdPlusToken usdPlusToken = IUsdPlusToken(usdPlus);
        uint256 totalNav = usdPlusToken.totalSupply() * newDelta / LIQ_DELTA_DM;
        (NonRebaseInfo [] memory nonRebaseInfo, uint256 nonRebaseDelta) = usdPlusToken.changeSupply(totalNav);
        usdPlusToken.mint(payoutManager, nonRebaseDelta);
        IPayoutManager(payoutManager).payoutDone(address(usdPlus), nonRebaseInfo);

        require(usdPlusToken.totalSupply() == totalNav,'total != nav');

        emit PayoutShortEvent(usdPlus, newDelta, nonRebaseDelta);
    }
}
