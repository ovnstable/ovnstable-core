// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;
import "../interfaces/IConnector.sol";
import "./aave/interfaces/ILendingPool.sol";
import "./aave/interfaces/ILendingPoolAddressesProvider.sol";
import "./aave/interfaces/IPriceOracleGetter.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../OwnableExt.sol";


contract ConnectorAAVE is IConnector, OwnableExt {
    IPriceOracleGetter oraclePrice; 
    ILendingPool pool;
    function setAAVE  (address _LPAP) public onlyOwner {
        ILendingPoolAddressesProvider lpap = ILendingPoolAddressesProvider(_LPAP);
        address oracle = lpap.getPriceOracle();
        oraclePrice = IPriceOracleGetter (oracle); 
        pool = ILendingPool(lpap.getLendingPool());

    }


    function stake (address _asset, address _pool, uint256 _amount, address _beneficiar ) public override  {
     //   ILendingPool pool = ILendingPool(_pool);
        IERC20(_asset).approve(address(pool), _amount);

        pool.deposit(_asset, _amount, _beneficiar, 0);
        }


    function unstake (address _asset, address _pool,uint256 _amount, address _to  ) public override  returns (uint256) {
     //   ILendingPool pool = ILendingPool(_pool);
        pool.withdraw(_asset, _amount, _to);
        }

    function getPriceOffer (address _asset,  address _pool) public view override returns (uint256) {

        return  oraclePrice.getAssetPrice(_asset);
    }


    function getPriceLiq (address _asset, address _pool, uint256 _balance) external view override returns (uint256) {

        uint price = getPriceOffer (_asset, _pool);
        uint income = pool.getReserveNormalizedIncome(_asset);
        return price*income / 10**27;
    }

}



