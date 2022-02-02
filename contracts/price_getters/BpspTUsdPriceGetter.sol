// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../price_getters/AbstractPriceGetter.sol";
import "../connectors/balancer/interfaces/IVault.sol";
import "../connectors/balancer/interfaces/IGeneralPool.sol";

contract BpspTUsdPriceGetter is AbstractPriceGetter {

    IVault public balancerVault;
    IERC20 public usdcToken;
    IERC20 public bpspTUsdToken;
    IGeneralPool public balancerPool;
    bytes32 public balancerPoolId;

    constructor(
        address _balancerVault,
        address _usdcToken,
        address _bpspTUsdToken,
        address _balancerPool,
        bytes32 _balancerPoolId
    ) {
        require(_balancerVault != address(0), "Zero address not allowed");
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_bpspTUsdToken != address(0), "Zero address not allowed");
        require(_balancerPool != address(0), "Zero address not allowed");
        require(_balancerPoolId != "", "Empty pool id not allowed");

        balancerVault = IVault(_balancerVault);
        usdcToken = IERC20(_usdcToken);
        bpspTUsdToken = IERC20(_bpspTUsdToken);
        balancerPool = IGeneralPool(_balancerPool);
        balancerPoolId = _balancerPoolId;
    }

    function getUsdcBuyPrice() external view override returns (uint256) {
        uint256 totalBalanceUsdc;
        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(balancerPoolId);
        for (uint256 i; i < tokens.length; i++) {
            if (tokens[i] != usdcToken) {
                uint256 oneToken = 10 ** (IERC20Metadata(address(tokens[i])).decimals());
                totalBalanceUsdc += balances[i] * _getUsdcTokenBuyPrice(tokens[i], oneToken) / oneToken;
            } else {
                totalBalanceUsdc += balances[i] * (10 ** 12);
            }
        }
        uint256 totalSupply = IERC20(address(balancerPool)).totalSupply();

        return (10 ** 18) * totalBalanceUsdc / totalSupply;
    }

    function getUsdcSellPrice() external view override returns (uint256) {
        uint256 totalBalanceUsdc;
        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(balancerPoolId);
        for (uint256 i; i < tokens.length; i++) {
            if (tokens[i] != usdcToken) {
                uint256 oneToken = 10 ** (IERC20Metadata(address(tokens[i])).decimals());
                totalBalanceUsdc += balances[i] * _getUsdcTokenSellPrice(tokens[i], oneToken) / oneToken;
            } else {
                totalBalanceUsdc += balances[i] * (10 ** 12);
            }
        }
        uint256 totalSupply = IERC20(address(balancerPool)).totalSupply();

        return (10 ** 18) * totalBalanceUsdc / totalSupply;
    }

    function _getUsdcTokenBuyPrice(IERC20 token, uint256 oneToken) internal view returns (uint256) {
        uint256 balanceUsdc = _onSwap(balancerPool, balancerPoolId, IVault.SwapKind.GIVEN_OUT, usdcToken, token, oneToken);
        return balanceUsdc * (10 ** 12);
    }

    function _getUsdcTokenSellPrice(IERC20 token, uint256 oneToken) internal view returns (uint256) {
        uint256 balanceUsdc = _onSwap(balancerPool, balancerPoolId, IVault.SwapKind.GIVEN_IN, token, usdcToken, oneToken);
        return balanceUsdc * (10 ** 12);
    }

    function _onSwap(IGeneralPool balancerPool,
        bytes32 balancerPoolId,
        IVault.SwapKind kind,
        IERC20 tokenIn,
        IERC20 tokenOut,
        uint256 balance
    ) internal view returns (uint256) {

        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(balancerPoolId);

        uint256 indexIn;
        uint256 indexOut;
        for (uint8 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenIn) {
                indexIn = i;
            } else if (tokens[i] == tokenOut) {
                indexOut = i;
            }
        }

        IPoolSwapStructs.SwapRequest memory swapRequest;
        swapRequest.kind = kind;
        swapRequest.tokenIn = tokenIn;
        swapRequest.tokenOut = tokenOut;
        swapRequest.amount = balance;

        return balancerPool.onSwap(swapRequest, balances, indexIn, indexOut);
    }
}
