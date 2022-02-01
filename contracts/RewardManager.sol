// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./connectors/curve/interfaces/IRewardOnlyGauge.sol";
import "./interfaces/IRewardManager.sol";
import "./Vault.sol";
import "./connectors/balancer/MerkleOrchard.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "hardhat/console.sol";

contract RewardManager is IRewardManager, Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");


    // ---  fields

    IRewardOnlyGauge public rewardGauge;
    Vault public vault;
    IERC20 public aUsdc;
    MerkleOrchard public merkleOrchard;

    // ---  events

    event RewardGaugeUpdated(address rewardGauge);
    event VaultUpdated(address vault);
    event AUsdcTokenUpdated(address aUsdc);
    event MerkleOrchardUpdated(address merkleOrchard);

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override
    {}

    // ---  setters

    function setRewardGauge(address _rewardGauge) external onlyAdmin {
        require(_rewardGauge != address(0), "Zero address not allowed");
        rewardGauge = IRewardOnlyGauge(_rewardGauge);
        emit RewardGaugeUpdated(_rewardGauge);
    }

    function setVault(address _vault) external onlyAdmin {
        require(_vault != address(0), "Zero address not allowed");
        vault = Vault(_vault);
        emit VaultUpdated(_vault);
    }

    function setAUsdcToken(address _aUsdc) external onlyAdmin {
        require(_aUsdc != address(0), "Zero address not allowed");
        aUsdc = IERC20(_aUsdc);
        emit AUsdcTokenUpdated(_aUsdc);
    }

    function setMerkleOrchard(address _merkleOrchard) external onlyAdmin {
        require(_merkleOrchard != address(0), "Zero address not allowed");
        merkleOrchard = MerkleOrchard(_merkleOrchard);
        emit MerkleOrchardUpdated(_merkleOrchard);
    }

    // ---  logic

    /**
    * Claim rewards from Curve gauge, Aave, MStable except Balancer where we have staked LP tokens
    */
    function claimRewards() external override {
        //TODO: add event if gauge emit nothing
        claimRewardCurve();
//        claimRewardAave();
        claimRewardMStable();
    }

    function claimRewardCurve() public {
        rewardGauge.claim_rewards(address(vault));
    }

    function claimRewardAave() public {
        address[] memory assets = new address[](1);
        assets[0] = address(aUsdc);
        vault.claimRewardAave(assets, type(uint256).max);
    }

    function claimRewardMStable() public {
        vault.claimRewardMStable();
    }

    //TODO: Balancer. FIX claiming
//    function claimRewardBalancer(
//    //        MerkleOrchard.Claim[] memory claims,
//    //        address[] memory _tokens
//        bytes32[] memory proof1,
//        bytes32[] memory proof2,
//        bytes32[] memory proof3
//    ) public {
//        console.log("Start claiming");
//        IERC20[] memory tokens = new IERC20[](3);
//        tokens[0] = IERC20(address(0x2e1AD108fF1D8C782fcBbB89AAd783aC49586756));
//        tokens[1] = IERC20(address(0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063));
//        tokens[2] = IERC20(address(0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270));
//        MerkleOrchard.Claim[] memory claims = new MerkleOrchard.Claim[](3);
//        for (uint256 i = 0; i < tokens.length; i++) {
//            console.log("Token %s", address(tokens[i]));
//            uint256 distributionId = merkleOrchard.getNextDistributionId(tokens[i], address(vault));
//            console.log("distributionId %s", distributionId);
//            uint256 balance = merkleOrchard.getRemainingBalance(tokens[i], address(vault));
//            console.log("balance %s", balance);
//            bytes32[] memory proof;
//            if (i == 0) {
//                proof = proof1;
//            } else if (i == 1) {
//                proof = proof2;
//            } else if (i == 2) {
//                proof = proof3;
//            }
//            MerkleOrchard.Claim memory claim = MerkleOrchard.Claim(distributionId, balance, address(vault), i, proof);
//            claims[i] = claim;
//        }
//        merkleOrchard.claimDistributions(address(vault), claims, tokens);
//        console.log("Finish claiming");
//    }
}
