// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import "@overnight-contracts/common/contracts/libraries/WadRayMath.sol";
import "./interfaces/IRemoteHub.sol";


contract WrappedUsdPlusToken is IERC4626, ERC20Upgradeable, AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable {
    using WadRayMath for uint256;

    bytes32 public constant PORTFOLIO_AGENT_ROLE = keccak256("PORTFOLIO_AGENT_ROLE");

    uint8 private _decimals;
    IRemoteHub public remoteHub;

    modifier onlyPortfolioAgent() {
        require(remoteHub.roleManager().hasRole(PORTFOLIO_AGENT_ROLE, msg.sender), "Restricted to Portfolio Agent");
        _;
    }

    modifier onlyCCIP() {
        require(remoteHub.ccipPool() == _msgSender(), "Caller is not the WRAPPER");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(string calldata name,
                        string calldata symbol,
                        uint8 newDecimals
                        ) initializer public {

        __ERC20_init(name, symbol);
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _decimals = newDecimals;
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(DEFAULT_ADMIN_ROLE)
    override
    {}

    function pause() public onlyPortfolioAgent {
        _pause();
    }

    function unpause() public onlyPortfolioAgent {
        _unpause();
    }

    function _convertToSharesUp(uint256 assets) internal view returns (uint256) {
        return assets.rayDiv(rate());
    }

    function _convertToSharesDown(uint256 assets) internal view returns (uint256) {
        return assets.rayDivDown(rate());
    }

    function _convertToAssetsUp(uint256 shares) internal view returns (uint256) {
        return shares.rayMul(rate());
    }

    function _convertToAssetsDown(uint256 shares) internal view returns (uint256) {
        return shares.rayMulDown(rate());
    }


    /// @inheritdoc ERC20Upgradeable
    function decimals() public view override(ERC20Upgradeable) returns (uint8) {
        return _decimals;
    }

    /// @inheritdoc IERC4626
    function totalAssets() external view override returns (uint256) {
        return _convertToAssetsDown(totalSupply());
    }

    /// @inheritdoc IERC4626
    function convertToShares(uint256 assets) external view override returns (uint256) {
        return _convertToSharesDown(assets);
    }

    /// @inheritdoc IERC4626
    function convertToAssets(uint256 shares) external view override returns (uint256) {
        return _convertToAssetsDown(shares);
    }

    /// @inheritdoc IERC4626
    function maxDeposit(address receiver) external view override returns (uint256) {
        return type(uint256).max;
    }

    /// @inheritdoc IERC4626
    function previewDeposit(uint256 assets) external view override returns (uint256) {
        return _convertToSharesDown(assets);
    }

    /// @inheritdoc IERC4626
    function deposit(uint256 assets, address receiver) whenNotPaused external override returns (uint256) {
        require(assets != 0, "Zero assets not allowed");
        require(receiver != address(0), "Zero address for receiver not allowed");

        remoteHub.usdp().transferFrom(msg.sender, address(this), assets);

        uint256 shares = _convertToSharesDown(assets);

        if (shares != 0) {
            _mint(receiver, shares);
        }

        emit Deposit(msg.sender, receiver, assets, shares);

        return shares;
    }

    /// @inheritdoc IERC4626
    function maxMint(address receiver) external view override returns (uint256) {
        return type(uint256).max;
    }

    /// @inheritdoc IERC4626
    function previewMint(uint256 shares) external view override returns (uint256) {
        return _convertToAssetsUp(shares);
    }

    // for CCIP
    function mint(address account, uint256 amount) external whenNotPaused onlyCCIP {
        uint256 assets = _convertToAssetsUp(amount);
        remoteHub.usdp().mint(address(this), assets);
        _mint(account, amount);
    }

    function burn(uint256 amount) external whenNotPaused onlyCCIP {
        _burn(msg.sender, amount);
        uint256 assets = _convertToAssetsUp(amount);
        remoteHub.usdp().burn(address(this), assets);
    }

    /// @inheritdoc IERC4626
    function mint(uint256 shares, address receiver) external whenNotPaused override returns (uint256) {
        require(shares != 0, "Zero shares not allowed");
        require(receiver != address(0), "Zero address for receiver not allowed");

        uint256 assets = _convertToAssetsUp(shares);

        if (assets != 0) {
            remoteHub.usdp().transferFrom(msg.sender, address(this), assets);
        }

        _mint(receiver, shares);

        emit Deposit(msg.sender, receiver, assets, shares);

        return assets;
    }

    /// @inheritdoc IERC4626
    function maxWithdraw(address owner) external view override returns (uint256) {
        return _convertToAssetsDown(balanceOf(owner));
    }

    /// @inheritdoc IERC4626
    function previewWithdraw(uint256 assets) external view override returns (uint256) {
        return _convertToSharesUp(assets);
    }

    /// @inheritdoc IERC4626
    function withdraw(uint256 assets, address receiver, address owner) external whenNotPaused override returns (uint256) {
        require(assets != 0, "Zero assets not allowed");
        require(receiver != address(0), "Zero address for receiver not allowed");
        require(owner != address(0), "Zero address for owner not allowed");

        uint256 shares = _convertToSharesUp(assets);

        if (owner != msg.sender) {
            uint256 currentAllowance = allowance(owner, msg.sender);
            require(currentAllowance >= shares, "Withdraw amount exceeds allowance");
            _approve(owner, msg.sender, currentAllowance - shares);
        }

        if (shares != 0) {
            _burn(owner, shares);
        }

        remoteHub.usdp().transfer(receiver, assets);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);

        return shares;
    }

    /// @inheritdoc IERC4626
    function maxRedeem(address owner) external view override returns (uint256) {
        return balanceOf(owner);
    }

    /// @inheritdoc IERC4626
    function previewRedeem(uint256 shares) external view override returns (uint256) {
        return _convertToAssetsDown(shares);
    }

    /// @inheritdoc IERC4626
    function redeem(uint256 shares, address receiver, address owner) external whenNotPaused override returns (uint256) {
        require(shares != 0, "Zero shares not allowed");
        require(receiver != address(0), "Zero address for receiver not allowed");
        require(owner != address(0), "Zero address for owner not allowed");

        if (owner != msg.sender) {
            uint256 currentAllowance = allowance(owner, msg.sender);
            require(currentAllowance >= shares, "Redeem amount exceeds allowance");
            _approve(owner, msg.sender, currentAllowance - shares);
        }

        _burn(owner, shares);

        uint256 assets = _convertToAssetsDown(shares);

        if (assets != 0) {
            remoteHub.usdp().transfer(receiver, assets);
        }

        emit Withdraw(msg.sender, receiver, owner, assets, shares);

        return assets;
    }

    function rate() public view returns (uint256) {
        return 10 ** 54 / remoteHub.usdp().rebasingCreditsPerTokenHighres();
    }

}
