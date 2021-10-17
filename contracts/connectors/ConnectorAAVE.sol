// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;
import "../interfaces/IConnector.sol";
import "./aave/interfaces/ILendingPool.sol";
import "./aave/interfaces/ILendingPoolAddressesProvider.sol";
import "./aave/interfaces/IPriceOracleGetter.sol";
import "../interfaces/IActivesList.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {WadRayMath} from "./aave/libraries/math/WadRayMath.sol";

import "../OwnableExt.sol";

contract ConnectorAAVE is IConnector, OwnableExt {
    using WadRayMath for uint256;
    IActivesList actList;
    address USDC;
    ILendingPoolAddressesProvider lpap;

    function setAAVE(address _LPAP, address _USDC) public onlyOwner {
        require(_LPAP != address(0), "Zero address not allowed");
        require(_USDC != address(0), "Zero address not allowed");
        lpap = ILendingPoolAddressesProvider(_LPAP);
        USDC = _USDC;
    }

    function setAddr(address _addrAL) external onlyOwner {
        require(_addrAL != address(0), "Zero address not allowed");
        actList = IActivesList(_addrAL);
    }

    function stake(
        address _asset,
        address _pool,
        uint256 _amount,
        address _beneficiar
    ) public override {
        revert("ConnectorAAVE: stake 4 not implemented");
    }

    function stake(
        address _asset,
        uint256 _amount,
        address _beneficiar
    ) public override {
        ILendingPool pool = ILendingPool(lpap.getLendingPool());
        IERC20(_asset).approve(address(pool), _amount);
        pool.deposit(_asset, _amount, _beneficiar, 0);
    }

    function unstake(
        address _asset,
        address _pool,
        uint256 _amount,
        address _to
    ) public override returns (uint256) {
        revert("ConnectorAAVE: unstake 4 not implemented");
    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _to
    ) public override returns (uint256) {
        ILendingPool pool = ILendingPool(lpap.getLendingPool());

        uint256 w = pool.withdraw(_asset, _amount, _to);
        DataTypes.ReserveData memory res = pool.getReserveData(_asset);

        IERC20(res.aTokenAddress).transfer(
            msg.sender,
            IERC20(res.aTokenAddress).balanceOf(address(this))
        );
        return w;
    }

    function getPriceOffer(address _asset, address _pool) public view override returns (uint256) {
        revert("ConnectorAAVE: getPriceOffer not implemented");
    }

    function getBookValue(
        address _asset,
        address _addrWault,
        address _pool
    ) external view override returns (uint256) {
        revert("ConnectorAAVE: getBookValue not implemented");
    }

    function getLiqValue(
        address _asset,
        address _addrWault,
        address _pool
    ) external view override returns (uint256) {
        revert("ConnectorAAVE: getLiqValue not implemented");
    }
}
