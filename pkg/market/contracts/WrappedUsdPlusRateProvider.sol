// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interfaces/IRateProvider.sol";
import "./interfaces/IWrappedUsdPlusToken.sol";

/**
 * @title Wrapped wUSD+ Rate Provider
 * @notice Returns the value of wUSD+ in terms of USD+
 */

contract WrappedUsdPlusRateProvider is IRateProvider{

    IWrappedUsdPlusToken public immutable wUsdPlus;

    constructor(IWrappedUsdPlusToken _wUsdPlus) {
        wUsdPlus = _wUsdPlus;
    }

    /**
     * @return the value of wUSD+ in terms of USD+
     */

    function getRate() external view override returns (uint256) {
        return wUsdPlus.convertToAssets(1e18);
    }
}
