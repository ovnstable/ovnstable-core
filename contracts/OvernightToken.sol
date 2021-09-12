// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

import "./interfaces/IERC20MintableBurnable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract OvernightToken is IERC20MintableBurnable, ERC20, AccessControl {
    using EnumerableSet for EnumerableSet.AddressSet;

    uint256 private _totalMint;
    uint256 private _totalBurn;

    bytes32 public constant EXCHANGER = keccak256("EXCHANGER");

    EnumerableSet.AddressSet private _owners;

    modifier onlyAdmin()
    {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyExchanger()
    {
        require(hasRole(EXCHANGER, msg.sender), "Caller is not the EXCHANGER");
        _;
    }

    constructor() ERC20("OvernightToken", "OVN") {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(address _sender, uint256 _amount) public override onlyExchanger {
        _mint(_sender, _amount);
        _totalMint += _amount;
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }


    function burn(address _sender, uint256 _amount) public override onlyExchanger {
        _burn(_sender, _amount);
        _totalBurn += _amount;
    }

    function totalMint() public view returns (uint256) {
        return _totalMint;
    }

    function totalBurn() public view returns (uint256) {
        return _totalBurn;
    }

    function ownerLength() public view returns (uint256) {
        return _owners.length();
    }

    function ownerAt(uint256 index) public view returns (address) {
        return _owners.at(index);
    }

    function ownerBalanceAt(uint256 index) public view returns (uint256) {
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


    function setExchanger(address account) public virtual onlyAdmin {
        grantRole(EXCHANGER, account);
    }

    function removeExchanger(address account) public virtual onlyAdmin
    {
        revokeRole(EXCHANGER, account);
    }
}
