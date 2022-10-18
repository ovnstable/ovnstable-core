pragma solidity ^0.8.0;

import "../Insurance.sol";

import "hardhat/console.sol";

contract MockInsurance is Insurance {


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Insurance_init();
    }

    function _deposit(uint256 _amount) internal override {


        console.log('Deposit %s', _amount);
        console.log('Total   %s', asset.totalSupply());
    }

    function _withdraw(uint256 _amount) internal override {
        console.log('Withdraw %s', _amount);
        console.log('Total    %s', asset.totalSupply());
    }

    function netAssetValue() public override returns (uint256) {
        return asset.balanceOf(address(this));
    }

}
