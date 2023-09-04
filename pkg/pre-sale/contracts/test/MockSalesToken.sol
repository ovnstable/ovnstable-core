pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./libraries/WadRayMath.sol";
import "hardhat/console.sol";

contract SalesToken is ERC20 {
    using WadRayMath for uint256;

    uint256 public liquidityIndex;
    uint256 public liquidityIndexDenominator;
    mapping(address => uint256) private _balances;

    constructor() ERC20("SalesToken", "SalesToken") {
        liquidityIndex = 10 ** 27;
        liquidityIndexDenominator = 10 ** 27;
    }

    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
        // console.log("_balances[to]", _balances[to], amount, to);
        _mint(to, amount);
    }

    function burn(address to, uint256 amount) external {
        _balances[to] -= amount;
        _burn(to, amount);
    }

    function setLiquidityIndex(uint256 _liquidityIndex) external {
        liquidityIndex = _liquidityIndex;
    }

    function balanceOf(address user) public view override returns (uint256) {
        uint256 balanceInMapping = _balanceOf(user);
        uint256 balance = balanceInMapping * liquidityIndex / 1e27;
        return balance;
    }

    function _balanceOf(address account) internal view returns (uint256) {
        // console.log("_balances[account]", _balances[account]);
        return _balances[account];
    }

    // function transferFrom(
    //     address sender,
    //     address recipient,
    //     uint256 amount
    // ) public override returns (bool) {
    //     uint256 transferAmount;
    //     if (amount == balanceOf(sender)) {
    //         // transfer all
    //         transferAmount = _balances[sender];
    //     } else {
    //         // up to ray
    //         transferAmount = amount.wadToRay();
    //         transferAmount = transferAmount.rayDiv(liquidityIndex);
    //     }

    //     _transfer(sender, recipient, transferAmount);

    //     uint256 currentAllowance;

    //     if(amount == allowance(sender, _msgSender())){
    //         currentAllowance = transferAmount;
    //     }else{
    //         currentAllowance = _allowance(sender, _msgSender());
    //     }

    //     require(currentAllowance >= transferAmount, "UsdPlusToken: transfer amount exceeds allowance");
    //     unchecked {
    //         _approve(sender, _msgSender(), currentAllowance - transferAmount);
    //     }
    //     emit Transfer(sender, recipient, amount);

    //     return true;
    // }


    // function _transfer(
    //     address sender,
    //     address recipient,
    //     uint256 amount
    // ) internal {
    //     require(sender != address(0), "ERC20: transfer from the zero address");
    //     require(recipient != address(0), "ERC20: transfer to the zero address");

    //     _beforeTokenTransfer(sender, recipient, amount);

    //     uint256 senderBalance = _balances[sender];
    //     require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");
    //     unchecked {
    //         _balances[sender] = senderBalance - amount;
    //     }
    //     _balances[recipient] += amount;

    //     _afterTokenTransfer(sender, recipient, amount);
    // }


    // /**
    //  * @dev See {IERC20-transfer}.
    //  */
    // function transfer(address recipient, uint256 amount) public override returns (bool) {
    //     uint256 transferAmount;
    //     if (amount == balanceOf(_msgSender())) {
    //         // transfer all
    //         transferAmount = _balances[_msgSender()];
    //     } else {
    //         // up to ray
    //         transferAmount = amount.wadToRay();
    //         transferAmount = transferAmount.rayDiv(liquidityIndex);
    //     }

    //     _transfer(_msgSender(), recipient, transferAmount);
    //     emit Transfer(_msgSender(), recipient, amount);
    //     return true;
    // }

}
