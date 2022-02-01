// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../price_getters/AbstractPriceGetter.sol";
import "../connectors/balancer/interfaces/IVault.sol";
import "../connectors/balancer/interfaces/IMinimalSwapInfoPool.sol";

contract BalPriceGetter is AbstractPriceGetter {

    IVault public balancerVault;
    IERC20 public usdcToken;
    IERC20 public balToken;
    IMinimalSwapInfoPool public balancerPool;
    bytes32 public balancerPoolId;

    constructor(
        address _balancerVault,
        address _usdcToken,
        address _balToken,
        address _balancerPool,
        bytes32 _balancerPoolId
    ) {
        require(_balancerVault != address(0), "Zero address not allowed");
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_balToken != address(0), "Zero address not allowed");
        require(_balancerPool != address(0), "Zero address not allowed");
        require(_balancerPoolId != "", "Empty pool id not allowed");

        balancerVault = IVault(_balancerVault);
        usdcToken = IERC20(_usdcToken);
        balToken = IERC20(_balToken);
        balancerPool = IMinimalSwapInfoPool(_balancerPool);
        balancerPoolId = _balancerPoolId;
    }

    function getUsdcBuyPrice() external view override returns (uint256) {
        uint256 balanceBal = 10 ** 18;
        uint256 balanceUsdc = _onSwap(balancerPool, balancerPoolId, IVault.SwapKind.GIVEN_OUT, usdcToken, balToken, balanceBal);
        return balanceUsdc * (10 ** 12);
    }

    function getUsdcSellPrice() external view override returns (uint256) {
        uint256 balanceBal = 10 ** 18;
        uint256 balanceUsdc = _onSwap(balancerPool, balancerPoolId, IVault.SwapKind.GIVEN_IN, balToken, usdcToken, balanceBal);
        return balanceUsdc * (10 ** 12);
    }

    function _onSwap(IMinimalSwapInfoPool balancerPool,
                    bytes32 balancerPoolId,
                    IVault.SwapKind kind,
                    IERC20 tokenIn,
                    IERC20 tokenOut,
                    uint256 balance
    ) internal view returns (uint256) {

        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(balancerPoolId);

        uint256 balanceIn;
        uint256 balanceOut;
        for (uint8 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenIn) {
                balanceIn = balances[i];
            } else if (tokens[i] == tokenOut) {
                balanceOut = balances[i];
            }
        }

        IPoolSwapStructs.SwapRequest memory swapRequest;
        swapRequest.kind = kind;
        swapRequest.tokenIn = tokenIn;
        swapRequest.tokenOut = tokenOut;
        swapRequest.amount = balance;

        return balancerPool.onSwap(swapRequest, balanceIn, balanceOut);
    }
}
