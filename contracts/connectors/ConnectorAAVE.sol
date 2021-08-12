// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;
import "../interfaces/IConnector.sol";
import "./aave/interfaces/ILendingPool.sol";
import "./aave/interfaces/ILendingPoolAddressesProvider.sol";
import "./aave/interfaces/IPriceOracleGetter.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../OwnableExt.sol";


contract ConnectorAAVE is IConnector, OwnableExt {

    ILendingPoolAddressesProvider poolProv;
    

    function setPoolProv (address _poolProvAddr) public onlyOwner {
        poolProv = ILendingPoolAddressesProvider(_poolProvAddr);
    }

    function stake (address _asset, uint256 _amount, address _beneficiar ) public override  {
        ILendingPool pool = ILendingPool(poolProv.getLendingPool());
        IERC20(_asset).approve(address(pool), _amount);

        pool.deposit(_asset, _amount, _beneficiar, 0);
        }


    function unstake (address _asset, uint256 _amount, address _to  ) public override  returns (uint256) {
        ILendingPool pool = ILendingPool(poolProv.getLendingPool());
        pool.withdraw(_asset, _amount, _to);
        }

    function getPrice (address _asset) external view override returns (uint256) {
        IPriceOracleGetter oracle = IPriceOracleGetter(poolProv.getLendingPool());
        return oracle.getAssetPrice(_asset);
    }

}



