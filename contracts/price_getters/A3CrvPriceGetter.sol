// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../price_getters/AbstractPriceGetter.sol";
import "../connectors/curve/interfaces/iCurvePool.sol";
import "../OwnableExt.sol";

contract A3CrvPriceGetter is AbstractPriceGetter, OwnableExt {
    iCurvePool pool;

    function setPool(address _pool) public onlyOwner {
        require(_pool != address(0), "Zero address not allowed");
        pool = iCurvePool(_pool);
    }

    function getUsdcBuyPrice() external view override returns (uint256) {
        uint256 virtualPrice = pool.get_virtual_price();
        return virtualPrice;
    }

    function getUsdcSellPrice() external view override returns (uint256) {
        uint256 virtualPrice = pool.get_virtual_price();
        return virtualPrice;
    }
}
