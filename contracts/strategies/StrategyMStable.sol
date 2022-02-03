// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "../interfaces/IStrategy.sol";
import "../Vault.sol";
import "../connectors/mstable/interfaces/IMasset.sol";
import "../connectors/mstable/interfaces/ISavingsContract.sol";
import "../connectors/mstable/interfaces/IBoostedVaultWithLockup.sol";

import "hardhat/console.sol";

contract StrategyMStable is IStrategy, AccessControlUpgradeable, UUPSUpgradeable {

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    Vault public vault;
    address public mUsdToken;
    address public imUsdToken;
    address public vimUsdToken;


    // --- events

    event StrategyMStableUpdate(address vault, address mUsdToken, address imUsdToken, address vimUsdToken);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }


    // --- Setters

    function setParams(
        address _vault,
        address _mUsdToken,
        address _imUsdToken,
        address _vimUsdToken
    ) external onlyAdmin {
        require(_vault != address(0), "Zero address not allowed");
        require(_mUsdToken != address(0), "Zero address not allowed");
        require(_imUsdToken != address(0), "Zero address not allowed");
        require(_vimUsdToken != address(0), "Zero address not allowed");

        vault = Vault(_vault);
        mUsdToken = _mUsdToken;
        imUsdToken = _imUsdToken;
        vimUsdToken = _vimUsdToken;

        emit StrategyMStableUpdate(_vault, _mUsdToken, _imUsdToken, _vimUsdToken);
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
    ) public override onlyTokenExchanger {
        IERC20(_asset).approve(mUsdToken, _amount);
        uint256 mintedTokens = IMasset(mUsdToken).mint(_asset, _amount, 0, address(this));
        IERC20(mUsdToken).approve(imUsdToken, mintedTokens);
        uint256 savedTokens = ISavingsContractV2(imUsdToken).depositSavings(mintedTokens, address(this));
        IERC20(imUsdToken).approve(vimUsdToken, savedTokens);
        IBoostedVaultWithLockup(vimUsdToken).stake(_beneficiary, savedTokens);
    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) public override onlyTokenExchanger returns (uint256) {
        vault.unstakeVimUsd(imUsdToken, _amount, address(this));
        ISavingsContractV2(imUsdToken).redeem(IERC20(imUsdToken).balanceOf(address(this)));
        IMasset(mUsdToken).redeem(_asset, IERC20(mUsdToken).balanceOf(address(this)), 0, address(this));
        uint256 redeemedTokens = IERC20(_asset).balanceOf(address(this));
        IERC20(_asset).transfer(_beneficiary, redeemedTokens);
        return redeemedTokens;
    }

    function unstakeVimUsd(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) external onlyPortfolioManager {
        vault.unstakeVimUsd(_asset, _amount, _beneficiary);
    }

    function claimRewards(address _beneficiary) external override returns (uint256){
        return 0;
    }
}
