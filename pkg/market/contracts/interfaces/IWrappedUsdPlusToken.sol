// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./IERC4626.sol";

interface IWrappedUsdPlusToken is IERC4626, IERC20, IERC20Metadata {

    /**
     * @dev Utility method to get the current UsdPlusToken balance of an user
     * @param account The address of the user
     * @return uint256 The UsdPlusToken balance
     **/
    function dynamicBalanceOf(address account) external view returns (uint256);

    /**
     * @dev Utility method to get converted from static to dynamic amount by rate
     * @param amount The static amount (StaticUsdPlusToken) to convert from
     * @return uint256 The dynamic amount (UsdPlusToken)
     **/
    function staticToDynamicAmount(uint256 amount) external view returns (uint256);

    /**
     * @dev Utility method to get converted from dynamic to static amount by rate
     * @param amount The dynamic amount (UsdPlusToken) to convert from
     * @return uint256 The static amount (StaticUsdPlusToken)
     **/
    function dynamicToStaticAmount(uint256 amount) external view returns (uint256);

    /**
     * @dev Returns UsdPlusToken liquidity index in e27 (ray)
     * @return rate Rate between StaticUsdPlusToken and UsdPlusToken in e27 (ray)
     **/
    function rate() external view returns (uint256);

    /**
     * @dev Returns UsdPlusToken address
     * @return address The address of UsdPlusToken
     **/
    function mainToken() external view returns (address);

}
