// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "./UsdPlusToken.sol";
import "./StaticUsdPlusToken.sol";
import "./Exchange.sol";

contract Market is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    IERC20 public usdcToken;
    UsdPlusToken public usdPlusToken;
    StaticUsdPlusToken public wrappedUsdPlusToken;

    Exchange public exchange;


    // --- events

    event MarketUpdatedTokens(
        address usdcToken,
        address usdPlusToken,
        address wrappedUsdPlusToken
    );

    event MarketUpdatedParams(address exchange);

    event Wrap(
        address asset,
        uint256 amount,
        address receiver
    );

    event Unwrap(
        address asset,
        uint256 amount,
        address receiver
    );


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


    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }


    // --- Setters

    function setTokens(
        address _usdcToken,
        address _usdPlusToken,
        address _wrappedUsdPlusToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_usdPlusToken != address(0), "Zero address not allowed");
        require(_wrappedUsdPlusToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        usdPlusToken = UsdPlusToken(_usdPlusToken);
        wrappedUsdPlusToken = StaticUsdPlusToken(_wrappedUsdPlusToken);

        emit MarketUpdatedTokens(_usdcToken, _usdPlusToken, _wrappedUsdPlusToken);
    }

    function setParams(
        address _exchange
    ) external onlyAdmin {

        require(_exchange != address(0), "Zero address not allowed");

        exchange = Exchange(_exchange);

        emit MarketUpdatedParams(_exchange);
    }


    // --- logic

    function wrap(
        address asset,
        uint256 amount,
        address receiver
    ) external {
        if (asset == address(usdcToken)) {
            usdcToken.transferFrom(msg.sender, address(this), amount);

            usdcToken.approve(address(exchange), amount);
            uint256 usdPlusAmount = exchange.buy(asset, amount);

            usdPlusToken.approve(address(wrappedUsdPlusToken), usdPlusAmount);
            uint256 wrappedUsdPlusAmount = wrappedUsdPlusToken.deposit(usdPlusAmount, receiver);

        } else if (asset == address(usdPlusToken)) {
            usdPlusToken.transferFrom(msg.sender, address(this), amount);

            usdPlusToken.approve(address(wrappedUsdPlusToken), amount);
            uint256 wrappedUsdPlusAmount = wrappedUsdPlusToken.deposit(amount, receiver);
        }

        emit Wrap(asset, amount, receiver);
    }

    function unwrap(
        address asset,
        uint256 amount,
        address receiver
    ) external {
        if (asset == address(usdcToken)) {
            wrappedUsdPlusToken.transferFrom(msg.sender, address(this), amount);

            wrappedUsdPlusToken.approve(address(wrappedUsdPlusToken), amount);
            uint256 usdPlusAmount = wrappedUsdPlusToken.redeem(amount, address(this), address(this));

            usdPlusToken.approve(address(exchange), usdPlusAmount);
            uint256 usdcAmount = exchange.redeem(asset, usdPlusAmount);

            usdcToken.transfer(receiver, usdcAmount);

        } else if (asset == address(usdPlusToken)) {
            wrappedUsdPlusToken.transferFrom(msg.sender, address(this), amount);

            wrappedUsdPlusToken.approve(address(wrappedUsdPlusToken), amount);
            uint256 usdPlusAmount = wrappedUsdPlusToken.redeem(amount, receiver, receiver);
        }

        emit Unwrap(asset, amount, receiver);
    }
}
