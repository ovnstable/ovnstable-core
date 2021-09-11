// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

import "./interfaces/IERC20MintableBurnable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract OvernightToken is IERC20MintableBurnable, ERC20, AccessControl {


    uint256 private _totalMint;
    uint256 private _totalBurn;

    bytes32 public constant EXCHANGER = keccak256("EXCHANGER");

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


    function setExchanger(address account) public virtual onlyAdmin {
        grantRole(EXCHANGER, account);
    }

    function removeExchanger(address account) public virtual onlyAdmin
    {
        revokeRole(EXCHANGER, account);
    }
}
