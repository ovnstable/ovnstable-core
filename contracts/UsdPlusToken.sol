// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

import "./libraries/math/WadRayMath.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract UsdPlusToken is Initializable, ERC20Upgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    using WadRayMath for uint256;
    using EnumerableSet for EnumerableSet.AddressSet;

    // ---  fields

    bytes32 public constant EXCHANGER = keccak256("EXCHANGER");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 public totalMint;
    uint256 public totalBurn;

    uint256 public liquidityIndexChangeTime;
    uint256 public liquidityIndex;
    uint256 public liquidityIndexDenominator;

    EnumerableSet.AddressSet _owners;

    // ---  events

    event ExchangerUpdated(address exchanger);
    event LiquidityIndexUpdated(uint256 changeTime, uint256 liquidityIndex);

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyExchanger() {
        require(hasRole(EXCHANGER, msg.sender), "Caller is not the EXCHANGER");
        _;
    }

    // ---  setters

    function setExchanger(address _exchanger) external onlyAdmin {
        grantRole(EXCHANGER, _exchanger);
        emit ExchangerUpdated(_exchanger);
    }

    function setLiquidityIndex(uint256 _liquidityIndex) external onlyExchanger {
        require(_liquidityIndex > 0, "Zero liquidity index not allowed");
        liquidityIndex = _liquidityIndex;
        liquidityIndexChangeTime = block.timestamp;
        emit LiquidityIndexUpdated(liquidityIndexChangeTime, liquidityIndex);
    }


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __ERC20_init("USD+", "USD+");
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);

        liquidityIndex  = 10 ** 27; // as Ray
        liquidityIndexDenominator = 10 ** 27; // Ray
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override
    {}


    // ---  logic

    function mint(address _sender, uint256 _amount) external onlyExchanger {
        // up to ray
        uint256 mintAmount = _amount.wadToRay();
        mintAmount = mintAmount.rayDiv(liquidityIndex);
        _mint(_sender, mintAmount);
        totalMint += _amount;
    }

    function burn(address _sender, uint256 _amount) external onlyExchanger {
        // up to ray
        uint256 burnAmount = _amount.wadToRay();
        burnAmount = burnAmount.rayDiv(liquidityIndex);
        _burn(_sender, burnAmount);
        totalBurn += _amount;
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @dev See {IERC20-transfer}.
     */
    function transfer(address recipient, uint256 amount) public override returns (bool) {
        // up to ray
        uint256 transferAmount = amount.wadToRay();
        transferAmount = transferAmount.rayDiv(liquidityIndex);
        _transfer(_msgSender(), recipient, transferAmount);
        return true;
    }


    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view override returns (uint256) {
        uint256 allowanceRay = super.allowance(owner, spender).rayMul(liquidityIndex);
        // ray -> wad
        return allowanceRay.rayToWad();
    }

    /**
     * @dev See {IERC20-approve}.
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        // up to ray
        uint256 scaledAmount = amount.wadToRay();
        scaledAmount = scaledAmount.rayDiv(liquidityIndex);
        _approve(_msgSender(), spender, scaledAmount);
        return true;
    }

    /**
     * @dev See {IERC20-approve}.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        // up to ray
        uint256 scaledAmount = amount.wadToRay();
        scaledAmount = scaledAmount.rayDiv(liquidityIndex);
        _transfer(sender, recipient, scaledAmount);

        uint256 currentAllowance = super.allowance(sender, _msgSender());
        require(currentAllowance >= scaledAmount, "UsdPlusToken: transfer amount exceeds allowance");
        unchecked {
            _approve(sender, _msgSender(), currentAllowance - scaledAmount);
        }

        return true;
    }


    /**
     * @dev Calculates the balance of the user: principal balance + interest generated by the principal
     * @param user The user whose balance is calculated
     * @return The balance of the user
     **/
    function balanceOf(address user)
    public
    view
    override (ERC20Upgradeable)
    returns (uint256)
    {
        // stored balance is ray (27)
        uint256 balanceInMapping = super.balanceOf(user);
        // ray -> ray
        uint256 balanceRay =  balanceInMapping.rayMul(liquidityIndex);
        // ray -> wad
        return balanceRay.rayToWad();
    }

    /**
     * @dev Returns the scaled balance of the user. The scaled balance is the sum of all the
     * updated stored balance divided by the reserve's liquidity index at the moment of the update
     * @param user The user whose balance is calculated
     * @return The scaled balance of the user
     **/
    function scaledBalanceOf(address user) external view returns (uint256) {
        return super.balanceOf(user);
    }


    /**
     * @dev calculates the total supply of the specific aToken
     * since the balance of every single user increases over time, the total supply
     * does that too.
     * @return the current total supply
     **/
    function totalSupply() public view override (ERC20Upgradeable) returns (uint256) {
        // stored totalSupply is ray (27)
        uint256 currentSupply = super.totalSupply();
        // ray -> ray
        uint256 currentSupplyRay = currentSupply.rayMul(liquidityIndex);
        // ray -> wad
        return currentSupplyRay.rayToWad();
    }

    /**
     * @dev Returns the scaled total supply of the variable debt token
     * @return the scaled total supply
     **/
    function scaledTotalSupply() public view returns (uint256) {
        return super.totalSupply();
    }


    function ownerLength() external view returns (uint256) {
        return _owners.length();
    }

    function ownerAt(uint256 index) external view returns (address) {
        return _owners.at(index);
    }

    function ownerBalanceAt(uint256 index) external view returns (uint256) {
        return balanceOf(_owners.at(index));
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._afterTokenTransfer(from, to, amount);

        if (from == address(0)) {
            // mint
            _owners.add(to);
        } else if (to == address(0)) {
            // burn
            if (balanceOf(from) == 0) {
                _owners.remove(from);
            }
        } else {
            // transfer
            if (balanceOf(from) == 0) {
                _owners.remove(from);
            }
            _owners.add(to);
        }
    }

}
