// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

import "./interfaces/IERC20MintableBurnable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract OvernightToken is IERC20MintableBurnable, ERC20, AccessControl {
    using EnumerableSet for EnumerableSet.AddressSet;

    uint256 _totalMint;
    uint256 _totalBurn;

    bytes32 public constant EXCHANGER = keccak256("EXCHANGER");

    EnumerableSet.AddressSet _owners;

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyExchanger() {
        require(hasRole(EXCHANGER, msg.sender), "Caller is not the EXCHANGER");
        _;
    }

    constructor() ERC20("OvernightToken", "OVN") {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(address _sender, uint256 _amount) external override onlyExchanger {
        _mint(_sender, _amount);
        _totalMint += _amount;
    }

    //TODO: check `virtual` usage
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }

    function burn(address _sender, uint256 _amount) external override onlyExchanger {
        _burn(_sender, _amount);
        _totalBurn += _amount;
    }

    function totalMint() external view returns (uint256) {
        return _totalMint;
    }

    function totalBurn() external view returns (uint256) {
        return _totalBurn;
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

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);

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

    //TODO: check `virtual` usage
    function setExchanger(address account) external virtual onlyAdmin {
        grantRole(EXCHANGER, account);
    }

    //TODO: check `virtual` usage and do we really need remove*
    function removeExchanger(address account) external virtual onlyAdmin {
        revokeRole(EXCHANGER, account);
    }
}
