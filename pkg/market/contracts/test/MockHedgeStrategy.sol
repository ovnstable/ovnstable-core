pragma solidity ^0.8.0;

import "../interfaces/IHedgeStrategy.sol";

contract MockHedgeStrategy is IHedgeStrategy {

    IERC20 public asset;

    bool public navLessThenExpected;
    bool public navLessAfterUnstake;
    bool public navLessAfterBalance;

    function setNavLessAfterBalance(bool value) external {
        navLessAfterBalance = value;
    }

    function setNavLessAfterUnstake(bool value) external {
        navLessAfterUnstake = value;
    }

    function setNavLessThenExpected(bool value) external {
        navLessThenExpected = value;
    }

    function setAsset(address _asset) external{
        asset = IERC20(_asset);
    }

    function stake(
        uint256 _amount
    ) external override {

    }

    function unstake(
        uint256 _amount,
        address _to
    ) external override returns (uint256){
        asset.transfer(_to, _amount);

        if(navLessAfterUnstake)
            navLessThenExpected = true;

        return _amount;
    }

    function netAssetValue() external override view returns (uint256){

        if(navLessThenExpected){
            return asset.balanceOf(address(this)) / 2;
        }else {
            return asset.balanceOf(address(this));
        }

    }


    function claimRewards(address to) external override returns (uint256){


    }

    function balance() external override{

        if(navLessAfterBalance)
            navLessThenExpected = true;

    }

    function setHealthFactor(uint256 healthFactor) external override{

    }


}
