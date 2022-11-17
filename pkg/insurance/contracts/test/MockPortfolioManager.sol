pragma solidity ^0.8.0;

import "@overnight-contracts/core/contracts/interfaces/IPortfolioManager.sol";
import "@overnight-contracts/core/contracts/interfaces/IMark2Market.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockPortfolioManager is IPortfolioManager, IMark2Market {

    bool public navLess;
    address public navLessTo;
    uint256 public avgApy;
    IERC20 public asset;

    function setAsset(address _asset) external {
        asset = IERC20(_asset);
    }

    function setNavLess(bool value, address to) external {
        navLess = value;
        navLessTo = to;
    }


    function deposit(IERC20 _token, uint256 _amount) external override{

    }

    function withdraw(IERC20 _token, uint256 _amount) external override returns (uint256){

    }


    function totalNetAssets() external view override returns (uint256){
        return asset.balanceOf(address(this));
    }


    function getStrategyWeight(address strategy) external override view returns (StrategyWeight memory){
        revert('not implement');
    }

    function getAllStrategyWeights() external override view returns (StrategyWeight[] memory){
        revert('not implement');
    }

    function claimAndBalance() external override {

    }

    function balance() external override{

    }

    function strategyAssets() external view override returns (StrategyAsset[] memory){
        revert('not implement');
    }


    function totalLiquidationAssets() external view override returns (uint256){
        return 0;
    }

}
