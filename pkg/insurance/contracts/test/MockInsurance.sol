pragma solidity ^0.8.0;

import "../Insurance.sol";

contract MockInsurance is Insurance {

    bool public navLess;
    address public navLessTo;
    uint256 public avgApy;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Insurance_init();

    }

    function setNavLess(bool value, address to) external {
        navLess = value;
        navLessTo = to;
    }

    function setAvgApy(uint256 _value) external {
        avgApy = _value;
    }

    function _deposit(uint256 _amount) internal override {

        if(navLess){
            asset.transfer(navLessTo, _amount);
        }
    }

    function _withdraw(uint256 _amount) internal override {

        if(navLess){
            asset.transfer(navLessTo, _amount);
        }
    }

    function netAssetValue() public view override returns (uint256) {
        return asset.balanceOf(address(this));
    }

    function getAvgApy() public view override returns (uint256) {
        return avgApy;
    }

}
