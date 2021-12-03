// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "./connectors/curve/interfaces/IRewardOnlyGauge.sol";
import "./connectors/aave/interfaces/IAaveIncentivesController.sol";
import "./interfaces/IRewardManager.sol";
import "./Vault.sol";

contract RewardManager is IRewardManager, AccessControl {


    IRewardOnlyGauge public rewardGauge;
    Vault public vault;
    IERC20 public amUSDC;

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    function setRewardGauge(address _rewardGauge) external onlyAdmin {
        require(_rewardGauge != address(0), "Zero address not allowed");
        rewardGauge = IRewardOnlyGauge(_rewardGauge);
    }

    function setVault(address _vault) external onlyAdmin {
        require(_vault != address(0), "Zero address not allowed");
        vault = Vault(_vault);
    }

    function setTokens(address _amUsdc) external onlyAdmin {
        require(_amUsdc != address(0), "Zero address not allowed");
        amUSDC = IERC20(_amUsdc);
    }

    /**
    * Claim rewards from Curve gauge, Aave where we have staked LP tokens
    */

    function claimRewards() external override {
        //TODO: add event if gauge emit nothing
        claimRewardCurve();
        claimRewardAave();
    }

    function claimRewardCurve() public {
        rewardGauge.claim_rewards(address(vault));
    }

    function claimRewardAave() public {

        address[] memory assets = new address[](1);
        assets[0] = address(amUSDC);
        vault.claimRewardAave(assets, type(uint256).max);
    }

}
