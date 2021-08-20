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
//IERC20(_asset).transferFrom(msg.sender, address(this), _amount);
        IERC20(_asset).approve(address(pool), _amount);

        pool.deposit(_asset, _amount, _beneficiar, 0);
        }

    function unstake(
        address _asset,
        address _pool,
        uint256 _amount,
        address _to
    ) public override returns (uint256) {
        //   ILendingPool pool = ILendingPool(_pool);

        //TODO: check if need here change amount because of usage of scaledAmount in
        //      mint/burn methods inside aToken
        uint256 unstackedAmount = pool.withdraw(_asset, _amount, address(this));

        // After withdraw ConnectorAAVE contract would have balance of returned tokens
        // so we need to transfer it back to PortfolioManager what call this method
        // here we need
        //TODO: may be should use _to instead of msg.sender
        IERC20(_asset).transfer(msg.sender, unstackedAmount);
        return unstackedAmount;
    }

    function getPriceOffer (address _asset,  address _pool) public view override returns (uint256) {

        return  oraclePrice.getAssetPrice(_asset);
    }


    function getPriceLiq (address _asset, address _where, uint256 _balance) external view override returns (uint256) {


        return IERC20(_asset).balanceOf(_where);
    }

}



