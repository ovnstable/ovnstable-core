// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../interfaces/IStrategy.sol";
import "../connectors/balancer/interfaces/IVault.sol";
import "../connectors/balancer/interfaces/IAsset.sol";

import "hardhat/console.sol";

contract StrategyMStable is IStrategy, AccessControlUpgradeable, UUPSUpgradeable {

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    IVault public balancerVault;
    bytes32 public balancerPoolId;


    // --- events

    event StrategyBalancerUpdate(address balancerVault, bytes32 balancerPoolId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }


        // --- Setters

    function setParams(
        address _balancerVault,
        bytes32 _balancerPoolId
    ) external onlyAdmin {
        require(_balancerVault != address(0), "Zero address not allowed");
        require(_balancerPoolId != "", "Empty pool id not allowed");

        balancerVault = IVault(_balancerVault);
        balancerPoolId = _balancerPoolId;

        emit StrategyBalancerUpdate(_balancerVault, _balancerPoolId);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override
    {}


    // --- logic

    function stake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) public override {
        IERC20(_asset).approve(address(balancerVault), _amount);

        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(balancerPoolId);

        IAsset[] memory assets = new IAsset[](4);
        uint256[] memory maxAmountsIn = new uint256[](4);
        uint256[] memory amountsIn = new uint256[](4);
        for (uint256 i; i < tokens.length; i++) {
            assets[i] = IAsset(address(tokens[i]));
            if (address(tokens[i]) == _asset) {
                maxAmountsIn[i] = _amount;
                amountsIn[i] = _amount;
            } else {
                maxAmountsIn[i] = 0;
                amountsIn[i] = 0;
            }
        }

        uint256 joinKind = 1;
        uint256 minimumBPT = 0;
        bytes memory userData = abi.encode(joinKind, amountsIn, minimumBPT);

        IVault.JoinPoolRequest memory request = IVault.JoinPoolRequest(assets, maxAmountsIn, userData, false);

        balancerVault.joinPool(balancerPoolId, address(this), _beneficiary, request);
    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) public override returns (uint256) {
        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(balancerPoolId);

        IAsset[] memory assets = new IAsset[](4);
        uint256[] memory minAmountsOut = new uint256[](4);
        for (uint256 i; i < tokens.length; i++) {
            assets[i] = IAsset(address(tokens[i]));
            if (address(tokens[i]) == _asset) {
                //TODO: Balancer. FIX if big slippage
                uint256 denominator = 10 ** (18 - IERC20Metadata(address(_asset)).decimals());
                minAmountsOut[i] = _amount / denominator * 9 / 10;
            } else {
                minAmountsOut[i] = 0;
            }
        }

        uint256 exitKind = 0;
        uint256 exitTokenIndex = 0;
        bytes memory userData = abi.encode(exitKind, _amount, exitTokenIndex);

        IVault.ExitPoolRequest memory request = IVault.ExitPoolRequest(assets, minAmountsOut, userData, false);

        balancerVault.exitPool(balancerPoolId, address(this), payable(_beneficiary), request);
        return IERC20(_asset).balanceOf(_beneficiary);
    }

    function liquidationValue(address _holder) external override view returns (uint256) {
        return 0;
    }

    function netAssetValue(address _holder) external override view returns (uint256){
        return 0;
    }

    function claimRewards(address _beneficiary) external override returns (uint256){
        return 0;
    }
}
