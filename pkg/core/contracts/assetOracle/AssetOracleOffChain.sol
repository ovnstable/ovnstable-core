// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../interfaces/IAssetOracle.sol";
import "../interfaces/IRoleManager.sol";

contract AssetOracleOffChain is IAssetOracle, Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    bytes32 public constant UNIT_ROLE = keccak256("UNIT_ROLE");

    address public asset;
    uint256 public priceAssetUsd;
    IPriceFeed public oracleUnderlyingAsset;
    address public underlyingAsset;
    IRoleManager public roleManager;
    uint256 public minPriceUsd;
    uint256 public maxPriceUsd;

    uint256 public assetDm;
    uint256 public underlyingAssetDm;

    uint256 public duration;
    uint256 public lastTimeUpdatedPrice;

    event UpdatePriceAssetUsd(uint256 price, uint256 lastTimeUpdatedPrice);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor()  {
        _disableInitializers();
    }

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        duration = 24 * 60 * 60;
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyAdmin
    override
    {}

    modifier onlyUnit(){
        require(roleManager.hasRole(UNIT_ROLE, msg.sender), "Restricted to Unit");
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    struct SetUpParams {
        address oracleUnderlyingAsset;
        address underlyingAsset;
        address roleManager;
        address asset;
        uint256 minPriceUsd;
        uint256 maxPriceUsd;
    }

    function setDuration(uint256 _duration) external onlyAdmin{
        duration = _duration;
    }

    function setParams(SetUpParams memory params) external onlyAdmin {
        asset = params.asset;
        underlyingAsset = params.underlyingAsset;

        oracleUnderlyingAsset = IPriceFeed(params.oracleUnderlyingAsset);
        roleManager = IRoleManager(params.roleManager);

        minPriceUsd = params.minPriceUsd;
        maxPriceUsd = params.maxPriceUsd;

        assetDm = 10 ** IERC20Metadata(params.asset).decimals();
        underlyingAssetDm = 10 ** IERC20Metadata(params.underlyingAsset).decimals();

    }

    function updatePriceAssetUsd(uint256 priceUsd) external onlyUnit {
        require(priceUsd > minPriceUsd, 'minPriceUsd');
        require(priceUsd < maxPriceUsd, 'maxPriceUsd');

        priceAssetUsd = priceUsd;
        lastTimeUpdatedPrice = block.timestamp;

        emit UpdatePriceAssetUsd(priceUsd, lastTimeUpdatedPrice);
    }

    function convert(address assetIn, address assetOut, uint256 amountIn) external view returns (uint256 amountOut){
        require(assetIn == asset || assetIn == underlyingAsset, 'assetIn not acceptable');
        require(assetOut == asset || assetOut == underlyingAsset, 'assetOut not acceptable');
        require(lastTimeUpdatedPrice + duration >= block.timestamp, 'price is old');

        uint256 priceUnderlyingUsd = ChainlinkLibrary.getPrice(oracleUnderlyingAsset);

        if (assetIn == asset) {
            return (amountIn * priceAssetUsd) / (priceUnderlyingUsd * assetDm) / underlyingAssetDm;
        } else {
            return (amountIn * priceUnderlyingUsd * assetDm * underlyingAssetDm) / priceAssetUsd;
        }
    }

    function convertDuration(address assetIn, address assetOut, uint256 amountIn, uint256 duration) external view returns (uint256 amountOut){
        revert('not support');
    }


}
