pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../PortfolioManager.sol";

contract TransferAssets is AccessControl {

//    IVault public oldVault;
//    IVault public newVault;
    PortfolioManager public portfolio;


    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }


    function setVaults(address _oldVault, address _newVault, address _portfolio) external onlyAdmin {
//        oldVault = Vault(_oldVault);
//        newVault = Vault(_newVault);
        portfolio = PortfolioManager(_portfolio);
    }


    function move() external onlyAdmin {
//        PortfolioManager.StrategyWeight[] memory assetInfos = portfolio.getAllStrategyWeights();
//        uint256 count = assetInfos.length;
//        for (uint8 i = 0; i < count; i++) {
//            PortfolioManager.StrategyWeight memory assetInfo = assetInfos[i];
//
//            IERC20 asset = IERC20(assetInfo.strategy);
//
//            uint256 balance = asset.balanceOf(address(oldVault));
//
//            if(balance > 0){
////                oldVault.transfer(asset, address(newVault), balance);
//            }
//        }
    }
}
