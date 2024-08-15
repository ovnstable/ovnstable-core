// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "@overnight-contracts/common/contracts/libraries/WadRayMath.sol";
import "@overnight-contracts/core/contracts/interfaces/IUsdPlusToken.sol";
import "@overnight-contracts/core/contracts/interfaces/IRoleManager.sol";

import "./interfaces/IWrappedUsdPlusToken.sol";

contract WrappedUsdPlusToken is IERC4626, ERC20Upgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    using WadRayMath for uint256;

    bytes32 public constant PORTFOLIO_AGENT_ROLE = keccak256("PORTFOLIO_AGENT_ROLE");

    IUsdPlusToken public asset;
    uint8 private _decimals;
    IRoleManager public roleManager;
    bool public paused;

    modifier onlyPortfolioAgent() {
        require(roleManager.hasRole(PORTFOLIO_AGENT_ROLE, msg.sender), "Restricted to Portfolio Agent");
        _;
    }

    modifier notPaused() {
        require(paused == false, "pause");
        _;
    }


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(address usdPlusTokenAddress,
                        string calldata name,
                        string calldata symbol,
                        uint8 decimals,
                        address roleManagerAddress
                        ) initializer public {

        __ERC20_init(name, symbol);
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _decimals = decimals;

        asset = IUsdPlusToken(usdPlusTokenAddress);
        roleManager = IRoleManager(roleManagerAddress);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(DEFAULT_ADMIN_ROLE)
    override
    {}

    function pause() public onlyPortfolioAgent {
        paused = true;
    }

    function unpause() public onlyPortfolioAgent {
        paused = false;
    }

    function setRoleManager(address _roleManager) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_roleManager != address(0), 'roleManager is zero');
        roleManager = IRoleManager(_roleManager);
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
    function deposit(uint256 assets, address receiver) notPaused external override returns (uint256) {
        require(assets != 0, "Zero assets not allowed");
        require(receiver != address(0), "Zero address for receiver not allowed");

        asset.transferFrom(msg.sender, address(this), assets);

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

    /// @inheritdoc IERC4626
    function mint(uint256 shares, address receiver) external notPaused override returns (uint256) {
        require(shares != 0, "Zero shares not allowed");
        require(receiver != address(0), "Zero address for receiver not allowed");

        uint256 assets = _convertToAssetsUp(shares);

        if (assets != 0) {
            asset.transferFrom(msg.sender, address(this), assets);
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
    function withdraw(uint256 assets, address receiver, address owner) external notPaused override returns (uint256) {
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

        asset.transfer(receiver, assets);

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
    function redeem(uint256 shares, address receiver, address owner) external notPaused override returns (uint256) {
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
            asset.transfer(receiver, assets);
        }

        emit Withdraw(msg.sender, receiver, owner, assets, shares);

        return assets;
    }

    function rate() public view returns (uint256) {
        return 10 ** 54 / asset.rebasingCreditsPerTokenHighres();
    }

}
