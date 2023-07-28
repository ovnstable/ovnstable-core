// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import "@pendle/core-v2/contracts/core/StandardizedYield/SYBase.sol";
import "@pendle/core-v2/contracts/core/libraries/Errors.sol";
import "@overnight-contracts/common/contracts/libraries/WadRayMath.sol";
import "./interfaces/IExchange.sol";
import "./interfaces/IUsdPlusToken.sol";

contract PendleUsdPlusTokenSY is SYBase {
    using WadRayMath for uint256;

    address public immutable usdPlusToken;
    address public immutable usdPlusExchanger;
    address public immutable baseAsset;

    constructor(
        string memory _name,
        string memory _symbol,
        address _usdPlusToken,
        address _usdPlusExchanger,
        address _baseAsset
    ) SYBase(_name, _symbol, _usdPlusToken) {
        usdPlusToken = _usdPlusToken;
        usdPlusExchanger = _usdPlusExchanger;
        baseAsset = _baseAsset;
    }

    function _deposit(
        address tokenIn,
        uint256 amountDeposited
    ) internal virtual override returns (uint256 amountSharesOut) {

        if (tokenIn == usdPlusToken) {
            amountSharesOut = amountDeposited;
        } else if (tokenIn == baseAsset) {
            IERC20(tokenIn).approve(usdPlusExchanger, amountDeposited);
            IExchange.MintParams memory mintParams = IExchange.MintParams(tokenIn, amountDeposited, "");
            IExchange(usdPlusExchanger).mint(mintParams);
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
            amountTokenOut = amountSharesToRedeem;
        } else if (tokenOut == baseAsset) {
            amountTokenOut = IExchange(usdPlusExchanger).redeem(tokenOut, amountSharesToRedeem);
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
            amountSharesOut = amountTokenToDeposit;
        } else if (tokenIn == baseAsset) {
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
            amountTokenOut = amountSharesToRedeem;
        } else if (tokenOut == baseAsset) {
            amountTokenOut = amountSharesToRedeem.rayMulDown(exchangeRate());
        } else {
            revert Errors.SYInvalidTokenOut(tokenOut);
        }

    }

    function getTokensIn() public view virtual override returns (address[] memory res) {
        res = new address[](2);
        res[0] = usdPlusToken;
        res[1] = baseAsset;
    }

    function getTokensOut() public view virtual override returns (address[] memory res) {
        res = new address[](2);
        res[0] = usdPlusToken;
        res[1] = baseAsset;
    }

    function isValidTokenIn(address token) public view virtual override returns (bool) {
        return token == usdPlusToken || token == baseAsset;
    }

    function isValidTokenOut(address token) public view virtual override returns (bool) {
        return token == usdPlusToken || token == baseAsset;
    }

    function assetInfo()
    external
    view
    returns (AssetType assetType, address assetAddress, uint8 assetDecimals)
    {
        return (AssetType.TOKEN, usdPlusToken, IERC20Metadata(usdPlusToken).decimals());
    }
}
