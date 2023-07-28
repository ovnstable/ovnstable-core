// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import "@pendle/core-v2/contracts/core/StandardizedYield/SYBase.sol";
import "@pendle/core-v2/contracts/core/libraries/Errors.sol";
import "@overnight-contracts/common/contracts/libraries/WadRayMath.sol";
import "./interfaces/IUsdPlusToken.sol";

contract PendleUsdPlusTokenSY is SYBase {
    using WadRayMath for uint256;

    address public immutable usdPlusToken;

    constructor(
        string memory _name,
        string memory _symbol,
        address _usdPlusToken
    ) SYBase(_name, _symbol, _usdPlusToken) {
        usdPlusToken = _usdPlusToken;
    }

    function _deposit(
        address tokenIn,
        uint256 amountDeposited
    ) internal virtual override returns (uint256 amountSharesOut) {

        if (tokenIn == usdPlusToken) {
            amountSharesOut = amountDeposited.rayDivDown(exchangeRate());
        } else {
            revert Errors.SYInvalidTokenIn(tokenIn);
        }
    }

    function _redeem(
        address receiver,
        address tokenOut,
        uint256 amountSharesToRedeem
    ) internal virtual override returns (uint256 amountTokenOut) {

        if (tokenOut == usdPlusToken) {
            amountTokenOut = amountSharesToRedeem.rayMulDown(exchangeRate());
        } else {
            revert Errors.SYInvalidTokenOut(tokenOut);
        }
        _transferOut(tokenOut, receiver, amountTokenOut);
    }

    function exchangeRate() public view virtual override returns (uint256) {
        return IUsdPlusToken(usdPlusToken).liquidityIndex();
    }

    // /*///////////////////////////////////////////////////////////////
    //             MISC FUNCTIONS FOR METADATA
    // //////////////////////////////////////////////////////////////*/

    function _previewDeposit(
        address tokenIn,
        uint256 amountTokenToDeposit
    ) internal view override returns (uint256 amountSharesOut) {

        if (tokenIn == usdPlusToken) {
            amountSharesOut = amountTokenToDeposit.rayDivDown(exchangeRate());
        } else {
            revert Errors.SYInvalidTokenIn(tokenIn);
        }

    }

    function _previewRedeem(
        address tokenOut,
        uint256 amountSharesToRedeem
    ) internal view override returns (uint256 amountTokenOut) {

        if (tokenOut == usdPlusToken) {
            amountTokenOut = amountSharesToRedeem.rayMulDown(exchangeRate());
        } else {
            revert Errors.SYInvalidTokenOut(tokenOut);
        }

    }

    function getTokensIn() public view virtual override returns (address[] memory res) {
        res = new address[](1);
        res[0] = usdPlusToken;
    }

    function getTokensOut() public view virtual override returns (address[] memory res) {
        res = new address[](1);
        res[0] = usdPlusToken;
    }

    function isValidTokenIn(address token) public view virtual override returns (bool) {
        return token == usdPlusToken;
    }

    function isValidTokenOut(address token) public view virtual override returns (bool) {
        return token == usdPlusToken;
    }

    function assetInfo()
    external
    view
    returns (AssetType assetType, address assetAddress, uint8 assetDecimals)
    {
        return (AssetType.TOKEN, usdPlusToken, IERC20Metadata(usdPlusToken).decimals());
    }
}
