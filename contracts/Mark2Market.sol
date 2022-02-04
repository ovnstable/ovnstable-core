// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/IMark2Market.sol";
import "./Portfolio.sol";
import "./Vault.sol";
import "./interfaces/IStrategy.sol";

contract Mark2Market is IMark2Market, Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");


    // ---  fields

    Vault public vault;
    Portfolio public portfolio;

    // ---  events

    event VaultUpdated(address vault);
    event PortfolioUpdated(address portfolio);


    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }


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

    function setVault(address _vault) external onlyAdmin {
        require(_vault != address(0), "Zero address not allowed");
        vault = Vault(_vault);
        emit VaultUpdated(_vault);
    }

    function setPortfolio(address _portfolio) external onlyAdmin {
        require(_portfolio != address(0), "Zero address not allowed");
        portfolio = Portfolio(_portfolio);
        emit PortfolioUpdated(_portfolio);
    }

    // ---  logic

    function strategyAssets() public view override returns (StrategyAsset[] memory) {

        Portfolio.StrategyWeight[] memory weights = portfolio.getAllStrategyWeights();
        uint256 count = weights.length;

        StrategyAsset[] memory assets = new StrategyAsset[](count);

        for (uint8 i = 0; i < count; i++) {
            Portfolio.StrategyWeight memory weight = weights[i];
            IStrategy item = IStrategy(weight.strategy);


            assets[i] = StrategyAsset(
                weight.strategy,
                item.netAssetValue(address(vault)),
                item.liquidationValue(address(vault))
            );
        }

        return assets;
    }


    function totalNetAssets() public view override returns (uint256){
        return totalAssets(false);
    }

    function totalLiquidationAssets() public view override returns (uint256){
        return totalAssets(true);
    }

    function totalAssets(bool liq) internal view returns (uint256)
    {
        uint256 totalUsdcPrice = 0;
        Portfolio.StrategyWeight[] memory weights = portfolio.getAllStrategyWeights();
        uint256 count = weights.length;

        StrategyAsset[] memory assets = new StrategyAsset[](count);

        for (uint8 i = 0; i < count; i++) {
            Portfolio.StrategyWeight memory weight = weights[i];
            IStrategy item = IStrategy(weight.strategy);

            if (liq) {
                totalUsdcPrice += item.liquidationValue(address(vault));
            } else {
                totalUsdcPrice += item.netAssetValue(address(vault));
            }
        }

        return totalUsdcPrice;
    }





}
