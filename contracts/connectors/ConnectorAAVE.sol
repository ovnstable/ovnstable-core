// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;
import "../interfaces/IConnector.sol";
import "./aave/interfaces/ILendingPool.sol";
import "./aave/interfaces/ILendingPoolAddressesProvider.sol";
import "./aave/interfaces/IPriceOracleGetter.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../OwnableExt.sol";


contract ConnectorAAVE is IConnector, OwnableExt {
    ILendingPoolAddressesProvider lpap;
    
    function setAAVE  (address _LPAP) public onlyOwner {
        lpap = ILendingPoolAddressesProvider(_LPAP);

    }


    function stake (address _asset, address _pool, uint256 _amount, address _beneficiar ) public override  {
       ILendingPool pool = ILendingPool(lpap.getLendingPool());
    //IERC20(_asset).transferFrom(msg.sender, address(this), _amount);
        IERC20(_asset).approve(address(pool), _amount);
     //   DataTypes.ReserveData memory res = pool.getReserveData(_asset);
        pool.deposit(_asset, _amount, _beneficiar, 0);
        }


    function unstake (address _asset, address _pool,uint256 _amount, address _to  ) public override  returns (uint256) {
       ILendingPool pool = ILendingPool(lpap.getLendingPool());
        pool.withdraw(_asset, _amount, _to);
        }

    function getPriceOffer (address _asset,  address _pool) public view override returns (uint256) {
       IPriceOracleGetter  oraclePrice = IPriceOracleGetter (lpap.getPriceOracle()); 

        return  oraclePrice.getAssetPrice(_asset);
    }


    function getPriceLiq (address _asset, address _where, uint256 _balance) external view override returns (uint256) {

     
        return IERC20(_asset).balanceOf(_where);
    }

}



