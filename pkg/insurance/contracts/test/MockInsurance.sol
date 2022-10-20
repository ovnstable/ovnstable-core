pragma solidity ^0.8.0;

import "../Insurance.sol";

import "hardhat/console.sol";

contract MockInsurance is Insurance {

    bool public navLess;
    address public navLessTo;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Insurance_init();
    }

    function setNavLess(bool value, address to) external {
        navLess = value;
        navLessTo = to;
    }

    function _deposit(uint256 _amount) internal override {

        console.log('Deposit %s', _amount);
        console.log('Total   %s', asset.totalSupply());

        if(navLess){
            asset.transfer(navLessTo, _amount);
        }
    }

    function _withdraw(uint256 _amount) internal override {
        console.log('Withdraw %s', _amount);
        console.log('Total    %s', asset.totalSupply());

        if(navLess){
            asset.transfer(navLessTo, _amount);
        }
    }

    function netAssetValue() public view override returns (uint256) {
        return asset.balanceOf(address(this));
    }

    function getAvgApy() public view override returns (uint256) {

        // 7.5
        return 7500000;
    }

}
