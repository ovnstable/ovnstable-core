// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import {IDistributor} from "@overnight-contracts/connectors/contracts/stuff/Fenix.sol";

import "./interfaces/IStrategy.sol";
import "./interfaces/IRoleManager.sol";


abstract contract Strategy is IStrategy, Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant PORTFOLIO_MANAGER = keccak256("PORTFOLIO_MANAGER");
    bytes32 public constant PORTFOLIO_AGENT_ROLE = keccak256("PORTFOLIO_AGENT_ROLE");
    bytes32 public constant UNIT_ROLE = keccak256("UNIT_ROLE");

    address public portfolioManager;
    uint256 public swapSlippageBP;
    uint256 public navSlippageBP;
    uint256 public stakeSlippageBP;
    IRoleManager public roleManager;
    
    string public name;

    ClaimConfig public claimConfig;

    function __Strategy_init() internal initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        swapSlippageBP = 20;
        navSlippageBP = 20;
        stakeSlippageBP = 4;
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(DEFAULT_ADMIN_ROLE)
    override
    {}


    // ---  modifiers

    modifier onlyPortfolioManager() {
        require(portfolioManager == msg.sender, "Restricted to PORTFOLIO_MANAGER");
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyPortfolioAgent() {
        require(roleManager.hasRole(PORTFOLIO_AGENT_ROLE, msg.sender), "Restricted to Portfolio Agent");
        _;
    }

    modifier onlyUnit(){
        require(roleManager.hasRole(UNIT_ROLE, msg.sender), "Restricted to Unit");
        _;
    }

    // --- setters

    function setStrategyParams(address _portfolioManager, address _roleManager) public onlyAdmin {
        require(_portfolioManager != address(0), "Zero address not allowed");
        require(_roleManager != address(0), "Zero address not allowed");
        portfolioManager = _portfolioManager;
        roleManager = IRoleManager(_roleManager);
    }

    function setSlippages(
        uint256 _swapSlippageBP,
        uint256 _navSlippageBP,
        uint256 _stakeSlippageBP
    ) public onlyPortfolioAgent {
        swapSlippageBP = _swapSlippageBP;
        navSlippageBP = _navSlippageBP;
        stakeSlippageBP = _stakeSlippageBP;
        emit SlippagesUpdated(_swapSlippageBP, _navSlippageBP, _stakeSlippageBP);
    }

    function setStrategyName(string memory _name) public onlyPortfolioAgent {
        name = _name;
    }

    function setClaimConfig(ClaimConfig memory _claimConfig) public onlyPortfolioAgent {
        claimConfig.operation = _claimConfig.operation;
        claimConfig.beneficiary = _claimConfig.beneficiary;
        claimConfig.distributor = _claimConfig.distributor;
    }

    // --- logic

    function stake(
        address _asset,
        uint256 _amount
    ) external override onlyPortfolioManager {

        uint256 minNavExpected = OvnMath.subBasisPoints(this.netAssetValue(), navSlippageBP);

        _stake(_asset, IERC20(_asset).balanceOf(address(this)));

        require(this.netAssetValue() >= minNavExpected, "Strategy NAV less than expected");

        emit Stake(_amount);
    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary,
        bool _targetIsZero
    ) external override onlyPortfolioManager returns (uint256) {
        uint256 minNavExpected = OvnMath.subBasisPoints(this.netAssetValue(), navSlippageBP);

        uint256 withdrawAmount;
        uint256 rewardAmount;
        if (_targetIsZero) {

            rewardAmount = _claimRewards(_beneficiary);

            withdrawAmount = _unstakeFull(_asset, _beneficiary);
        } else {
            withdrawAmount = _unstake(_asset, _amount, _beneficiary);
            
            require(withdrawAmount >= _amount, 'Returned value less than requested amount');
        }


        require(this.netAssetValue() >= minNavExpected, "Strategy NAV less than expected");

        IERC20(_asset).transfer(_beneficiary, withdrawAmount);

        emit Unstake(_amount, withdrawAmount);
        if (rewardAmount > 0) {
            emit Reward(rewardAmount);
        }

        return withdrawAmount;
    }

    function claimRewards(address _to) external override onlyPortfolioManager returns (uint256) {
        uint256 rewardAmount = _claimRewards(_to);
        if (rewardAmount > 0) {
            emit Reward(rewardAmount);
        }
        return rewardAmount;
    }

    function _stake(
        address _asset,
        uint256 _amount
    ) internal virtual {
        revert("Not implemented");
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal virtual returns (uint256) {
        revert("Not implemented");
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal virtual returns (uint256) {
        revert("Not implemented");
    }

    function _claimRewards(address _to) internal virtual returns (uint256) {
        revert("Not implemented");
    }

    function claimMerkl(
        address[] calldata users,
        address[] calldata tokens,
        uint256[] calldata amounts,
        bytes32[][] calldata proofs
    ) external virtual onlyUnit {
        ClaimConfig memory config = claimConfig;
        IDistributor(config.distributor).claim(users, tokens, amounts, proofs);
        if (claimConfig.operation == Operation.REINVEST) {
            _reinvest();
        } else if (claimConfig.operation == Operation.SEND){
            _sendToTreshery(config);
        } else {
            _custom(config);
        }
    }

    function _reinvest() internal virtual {
        revert("Not implemented");
    }

    function _sendToTreshery(
        ClaimConfig memory claimConfig
    ) internal virtual {
        revert("Not implemented");
    }

    function _custom(
        ClaimConfig memory claimConfig
    ) internal virtual {
        revert("Not implemented");
    }


    uint256[32] private __gap;
}
