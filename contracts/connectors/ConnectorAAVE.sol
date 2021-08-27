// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;
import "../interfaces/IConnector.sol";
import "./aave/interfaces/ILendingPool.sol";
import "./aave/interfaces/ILendingPoolAddressesProvider.sol";
import "./aave/interfaces/IPriceOracleGetter.sol";
import "../interfaces/IActivesList.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {WadRayMath} from './aave/libraries/math/WadRayMath.sol';

import "../OwnableExt.sol";


contract ConnectorAAVE is IConnector, OwnableExt {
    using WadRayMath for uint256;
    IActivesList actList;
    address USDC;
    ILendingPoolAddressesProvider lpap;
    
    function setAAVE  (address _LPAP, address _USDC) public onlyOwner {
        lpap = ILendingPoolAddressesProvider(_LPAP);
        USDC = _USDC;
    }

    function setAddr (address _addrAL) external onlyOwner {
        actList = IActivesList(_addrAL);
    }



    function stake (address _asset, address _pool, uint256 _amount, address _beneficiar ) public override  {
       ILendingPool pool = ILendingPool(lpap.getLendingPool());
    //IERC20(_asset).transferFrom(msg.sender, address(this), _amount);
        IERC20(_asset).approve(address(pool), _amount);
     //   DataTypes.ReserveData memory res = pool.getReserveData(_asset);

        pool.deposit(_asset, _amount, _beneficiar, 0);
        // actList.changeBal(_asset, -int128(uint128(_amount)));

        // actList.changeBal(pool.lp_token(), int128(uint128(retAmount)));

        }


    function unstake (address _asset, address _pool,uint256 _amount, address _to  ) public override  returns (uint256) {
       ILendingPool pool = ILendingPool(lpap.getLendingPool());
        // IERC20(_asset).transfer(address(pool), _amount);
        uint w = pool.withdraw(_asset, _amount, _to);
        DataTypes.ReserveData memory res = pool.getReserveData(_asset);

        IERC20(res.aTokenAddress).transfer(msg.sender, 
                                IERC20(res.aTokenAddress).balanceOf(address(this)));
        return   w;
        }

    function getPriceOffer (address _asset,  address _pool) public view override returns (uint256) {
       IPriceOracleGetter  oraclePrice = IPriceOracleGetter (lpap.getPriceOracle()); 

        try oraclePrice.getAssetPrice(_asset) returns (uint price)
        {       
            try oraclePrice.getAssetPrice(USDC) returns (uint priceUSDC)
            {
            return price *10**18 / priceUSDC;
            } catch {
            return 0;
            }
           
        } catch {
           return 0;
        }
  
    }


    function getBookValue (address _asset, address _addrWault,  address _pool) external view override returns (uint256) {

        return IERC20(_asset).balanceOf(_addrWault);
    }

    function getLiqValue (address _asset, address _addrWault,  address _pool) external view override returns (uint256) {
        uint256 balance = IERC20(_asset).balanceOf(_addrWault);
        ILendingPool pool = ILendingPool(lpap.getLendingPool());
        DataTypes.ReserveData memory res = pool.getReserveData(_asset);
        if  (res.liquidityIndex > 0) {
            balance = balance.rayDiv(res.liquidityIndex);
        }       
     return balance;
    }


}



