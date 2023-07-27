// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.17;

import "@pendle/core-v2/contracts/core/StandardizedYield/SYBase.sol";
import "@overnight-contracts/common/contracts/libraries/WadRayMath.sol";
import "../interfaces/IExchange.sol";
import "../interfaces/IUsdPlusToken.sol";


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

    // function wrap(uint256 amountTokenIn) external {
    //     _transferIn(apeCoin, msg.sender, amountTokenIn);
    //     uint256 amountSharesOut = _deposit(apeCoin, amountTokenIn);
    //     _mint(msg.sender, amountSharesOut);
    //     emit Deposit(msg.sender, msg.sender, apeCoin, amountTokenIn, amountSharesOut);
    // }

    // function unwrap(uint256 amountShares) external {
    //     _burn(msg.sender, amountShares);
    //     uint256 amountTokenOut = _redeem(msg.sender, apeCoin, amountShares);
    //     emit Redeem(msg.sender, msg.sender, apeCoin, amountShares, amountTokenOut);
    // }

    function _deposit(
        address tokenIn,
        uint256 amountDeposited
    ) internal virtual override returns (uint256 amountSharesOut) {
        
        if (tokenIn == usdPlusToken) {
            amountSharesOut = amountDeposited;
        } else {
            IExchange.MintParams memory mintParams = IExchange.MintParams(baseAsset, amountDeposited, "");
            amountSharesOut = IExchange(usdPlusExchanger).mint(mintParams);
        }
    }

    function _redeem(
        address receiver,
        address tokenOut,
        uint256 amountSharesToRedeem
    ) internal virtual override returns (uint256 amountTokenOut) {

        if (tokenOut == qiToken) {
            amountTokenOut = amountSharesToRedeem;
        } else {
            amountTokenOut = IExchange(usdPlusExchanger).redeem(tokenOut, amountSharesToRedeem);
        }
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
       amountSharesOut = amountTokenToDeposit.rayDivDown(exchangeRate());
    }

    function _previewRedeem(
        address tokenOut,
        uint256 amountSharesToRedeem
    ) internal view override returns (uint256 amountTokenOut) {
        amountTokenOut = amountSharesToRedeem.rayMulDown(exchangeRate());
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
