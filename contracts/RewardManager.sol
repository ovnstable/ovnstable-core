// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "./connectors/curve/interfaces/IRewardOnlyGauge.sol";
import "./interfaces/IRewardManager.sol";
import "./Vault.sol";
import "./connectors/balancer/MerkleOrchard.sol";

contract RewardManager is IRewardManager, AccessControl {

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

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

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
    * Claim rewards from Curve gauge, Aave, Balancer where we have staked LP tokens
    */
    function claimRewards() external override {
        //TODO: add event if gauge emit nothing
        claimRewardCurve();
        claimRewardAave();
        claimRewardBalancer();
    }

    function claimRewardCurve() public {
        rewardGauge.claim_rewards(address(vault));
    }

    function claimRewardAave() public {
        address[] memory assets = new address[](1);
        assets[0] = address(aUsdc);
        vault.claimRewardAave(assets, type(uint256).max);
    }

    function claimRewardBalancer() public {
        //TODO balancer
//        merkleOrchard.claimDistributions(claimer, claims, tokens);
    }
}
