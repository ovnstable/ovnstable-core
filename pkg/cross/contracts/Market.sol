// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./interfaces/IRemoteHub.sol";

contract Market is IMarket, Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    IERC20 public usdcToken;
    IRemoteHub public remoteHub;

    // --- events

    event MarketUpdatedTokens(
        address usdcToken
    );

    event MarketUpdatedParams(address exchange);

    event Wrap(
        address asset,
        uint256 amount,
        address receiver,
        uint256 wrappedUsdPlusAmount
    );

    event Unwrap(
        address asset,
        uint256 amount,
        address receiver,
        uint256 unwrappedUsdPlusAmount
    );

    function usdPlus() internal view returns(IUsdPlusToken) {
        return remoteHub.usdp();
    }

    function wrappedUsdPlus() internal view returns(IWrappedUsdPlusToken) {
        return remoteHub.wusdp();
    }

    function exchange() internal view returns(IExchange) {
        return remoteHub.exchange();
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(DEFAULT_ADMIN_ROLE)
    override
    {}


    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }


    // --- Setters

    function setTokens(
        address _usdcToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);

        emit MarketUpdatedTokens(_usdcToken);
    }

    // --- logic

    /**
     * @dev preview wrap `amount` of `asset` to wUSD+.
     *
     * This is an estimate amount, real amount may vary.
     *
     * Requirements:
     *
     * - `asset` cannot be the zero address.
     * - `amount` cannot be the zero.
     */
    function previewWrap(
        address asset,
        uint256 amount
    ) external view override returns (uint256) {
        require(asset != address(0), "Zero address for asset not allowed");
        require(amount != 0, "Zero amount not allowed");

        if (asset == address(usdcToken)) {
            uint256 buyFeeAmount = (amount * exchange().buyFee()) / exchange().buyFeeDenominator();
            return wrappedUsdPlus().previewDeposit(amount - buyFeeAmount);
        } else if (asset == address(usdPlus())) {
            return wrappedUsdPlus().previewDeposit(amount);
        } else {
            revert('Asset not found');
        }
    }

    /**
     * @dev preview unwrap `amount` of wUSD+ to `asset`.
     *
     * This is an estimate amount, real amount may vary.
     *
     * Requirements:
     *
     * - `asset` cannot be the zero address.
     * - `amount` cannot be the zero.
     */
    function previewUnwrap(
        address asset,
        uint256 amount
    ) external view override returns (uint256) {
        require(asset != address(0), "Zero address for asset not allowed");
        require(amount != 0, "Zero amount not allowed");

        if (asset == address(usdcToken)) {
            uint256 usdPlusAmount = wrappedUsdPlus().previewRedeem(amount);
            uint256 redeemFeeAmount = (usdPlusAmount * exchange().redeemFee()) / exchange().redeemFeeDenominator();
            return usdPlusAmount - redeemFeeAmount;
        } else if (asset == address(usdPlus())) {
            return wrappedUsdPlus().previewRedeem(amount);
        } else {
            revert('Asset not found');
        }
    }

    /**
     * @dev Wrap `amount` of `asset` from `msg.sender` to wUSD+ of `receiver`.
     *
     * Emits a {Wrap} event.
     *
     * Requirements:
     *
     * - `asset` cannot be the zero address.
     * - `amount` cannot be the zero.
     * - `receiver` cannot be the zero address.
     */
    function wrap(
        address asset,
        uint256 amount,
        address receiver
    ) external override returns (uint256) {
        require(asset != address(0), "Zero address for asset not allowed");
        require(amount != 0, "Zero amount not allowed");
        require(receiver != address(0), "Zero address for receiver not allowed");

        uint256 wrappedUsdPlusAmount;
        if (asset == address(usdcToken)) {
            usdcToken.transferFrom(msg.sender, address(this), amount);

            usdcToken.approve(address(exchange()), amount);
            uint256 usdPlusAmount = exchange().buy(asset, amount);

            usdPlus().approve(address(wrappedUsdPlus()), usdPlusAmount);
            wrappedUsdPlusAmount = wrappedUsdPlus().deposit(usdPlusAmount, receiver);

        } else if (asset == address(usdPlus())) {
            usdPlus().transferFrom(msg.sender, address(this), amount);

            usdPlus().approve(address(wrappedUsdPlus()), amount);
            wrappedUsdPlusAmount = wrappedUsdPlus().deposit(amount, receiver);

        } else {
            revert('Asset not found');
        }

        emit Wrap(asset, amount, receiver, wrappedUsdPlusAmount);

        return wrappedUsdPlusAmount;
    }

    /**
     * @dev Unwrap `amount` of wUSD+ from `msg.sender` to `asset` of `receiver`.
     *
     * Emits a {Unwrap} event.
     *
     * Requirements:
     *
     * - `asset` cannot be the zero address.
     * - `amount` cannot be the zero.
     * - `receiver` cannot be the zero address.
     */
    function unwrap(
        address asset,
        uint256 amount,
        address receiver
    ) external override returns (uint256) {
        require(asset != address(0), "Zero address for asset not allowed");
        require(amount != 0, "Zero amount not allowed");
        require(receiver != address(0), "Zero address for receiver not allowed");

        uint256 unwrappedUsdPlusAmount;
        if (asset == address(usdcToken)) {
            wrappedUsdPlus().transferFrom(msg.sender, address(this), amount);

            wrappedUsdPlus().approve(address(wrappedUsdPlus()), amount);
            uint256 usdPlusAmount = wrappedUsdPlus().redeem(amount, address(this), address(this));

            usdPlus().approve(address(exchange()), usdPlusAmount);
            unwrappedUsdPlusAmount = exchange().redeem(asset, usdPlusAmount);

            usdcToken.transfer(receiver, unwrappedUsdPlusAmount);

        } else if (asset == address(usdPlus())) {
            wrappedUsdPlus().transferFrom(msg.sender, address(this), amount);

            wrappedUsdPlus().approve(address(wrappedUsdPlus()), amount);
            unwrappedUsdPlusAmount = wrappedUsdPlus().redeem(amount, receiver, address(this));

        } else {
            revert('Asset not found');
        }

        emit Unwrap(asset, amount, receiver, unwrappedUsdPlusAmount);

        return unwrappedUsdPlusAmount;
    }

}
