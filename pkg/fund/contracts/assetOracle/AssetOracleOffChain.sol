// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../interfaces/IAssetOracle.sol";
import "../interfaces/IRoleManager.sol";

/**
 * @title AssetOracleOffChain
 * @dev Off-chain oracle for fetching asset prices.
 */
contract AssetOracleOffChain is IAssetOracle, Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    // Role definitions
    bytes32 public constant UNIT_ROLE = keccak256("UNIT_ROLE");

    // State variables
    address public asset;
    uint256 public priceAssetUsd;
    IRoleManager public roleManager;
    uint256 public minPriceUsd;
    uint256 public maxPriceUsd;

    uint256 public assetDm;

    uint256 public duration;
    uint256 public lastTimeUpdatedPrice;

    mapping(address => UnderlyingItem) public underlyingItems;

    struct UnderlyingItem {
        uint256 dm;
        address assetAddress;
        address oracle;
    }

    // Event triggered upon updating the USD price of the asset
    event UpdatePriceAssetUsd(uint256 price, uint256 lastTimeUpdatedPrice);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor()  {
        _disableInitializers();
    }

    /**
     * @dev Initializes the AssetOracleOffChain contract.
     */
    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        // Grant admin role to the deployer
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // Set default duration to 24 hours
        duration = 24 * 60 * 60;
    }

    /**
     * @dev Authorizes the upgrade of the contract.
     * @param newImplementation Address of the new implementation.
     */
    function _authorizeUpgrade(address newImplementation)
    internal
    onlyAdmin
    override
    {}

    /**
     * @dev Modifier: Checks if the caller has the UNIT_ROLE.
     */
    modifier onlyUnit(){
        require(roleManager.hasRole(UNIT_ROLE, msg.sender), "Restricted to Unit");
        _;
    }

    /**
     * @dev Modifier: Checks if the caller has the DEFAULT_ADMIN_ROLE.
     */
    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    /**
     * @dev Struct for setting up contract parameters.
     */
    struct SetUpParams {
        address roleManager;
        address asset;
        uint256 minPriceUsd;
        uint256 maxPriceUsd;
    }

    /**
     * @dev Sets the duration for which the price is considered valid.
     * @param _duration New duration value in seconds.
     */
    function setDuration(uint256 _duration) external onlyAdmin {
        duration = _duration;
    }

    /**
     * @dev Sets up the initial parameters for the oracle.
     * @param params Struct containing the setup parameters.
     */
    function setParams(SetUpParams memory params) external onlyAdmin {
        asset = params.asset;
        roleManager = IRoleManager(params.roleManager);

        minPriceUsd = params.minPriceUsd;
        maxPriceUsd = params.maxPriceUsd;

        assetDm = 10 ** IERC20Metadata(params.asset).decimals();
    }

   /**
    * @dev Removes an underlying item from the mapping.
    * @param assetAddress Address of the underlying asset to be removed.
    * Requirements:
    * - The caller must have the DEFAULT_ADMIN_ROLE.
    */

    function removeUnderlyingItem(address assetAddress) external onlyAdmin {

        underlyingItems[assetAddress] = UnderlyingItem({
            dm: 0,
            assetAddress: address(0),
            oracle: address(0)
        });
    }

    /**
     * @dev Sets parameters for an underlying asset.
     * @param item Struct containing parameters for the underlying asset.
     * Requirements:
     * - The caller must have the DEFAULT_ADMIN_ROLE.
     */

    function setUnderlyingItem(UnderlyingItem memory item) external onlyAdmin {
        require(item.assetAddress != address(0), 'assetAddress is zero');
        require(item.oracle != address(0), 'oracle is zero');

        item.dm = 10 ** IERC20Metadata(item.assetAddress).decimals();
        underlyingItems[item.assetAddress] = item;
    }

    /**
     * @dev Updates the USD price of the asset.
     * Decimals in 1e8
     * @param priceUsd New USD price of Asset.
     */
    function updatePriceAssetUsd(uint256 priceUsd) external onlyUnit {
        require(priceUsd > minPriceUsd, 'minPriceUsd');
        require(priceUsd < maxPriceUsd, 'maxPriceUsd');

        priceAssetUsd = priceUsd;
        lastTimeUpdatedPrice = block.timestamp;

        emit UpdatePriceAssetUsd(priceUsd, lastTimeUpdatedPrice);
    }

    /**
     * @dev Converts the specified amount of one asset to another.
     * @param assetIn Address of the input asset.
     * @param assetOut Address of the output asset.
     * @param amountIn Amount of the input asset.
     * @dev Return Amount of the output asset.
     */
    function convert(address assetIn, address assetOut, uint256 amountIn) external view returns (uint256 amountOut) {
        require(lastTimeUpdatedPrice + duration >= block.timestamp, 'price is old');

        UnderlyingItem memory item;
        if (assetIn == asset) {
            item = underlyingItems[assetOut];
        } else if (assetOut == asset) {
            item = underlyingItems[assetIn];
        } else {
            revert('assetIn/assetOut not acceptable');
        }

        if (item.dm == 0) {
            revert('item is empty');
        }

        uint256 underlyingAssetDm = item.dm;
        uint256 priceUnderlyingUsd = ChainlinkLibrary.getPrice(IPriceFeed(item.oracle));

        if (assetIn == asset) {
            return ChainlinkLibrary.convertTokenToToken(amountIn, assetDm, underlyingAssetDm, priceAssetUsd, priceUnderlyingUsd);
        } else {
            return ChainlinkLibrary.convertTokenToToken(amountIn, underlyingAssetDm, assetDm, priceUnderlyingUsd, priceAssetUsd);
        }

    }

    /**
     * @dev Placeholder function. Not supported in this implementation.
     */
    function convertDuration(address assetIn, address assetOut, uint256 amountIn, uint256 duration) external view returns (uint256 amountOut) {
        revert('not support');
    }
}
