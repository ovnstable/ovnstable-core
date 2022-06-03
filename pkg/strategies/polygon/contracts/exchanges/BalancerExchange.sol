// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../connectors/balancer/interfaces/IVault.sol";
import "../connectors/balancer/interfaces/IGeneralPool.sol";
import "../connectors/balancer/interfaces/IMinimalSwapInfoPool.sol";
import "../connectors/balancer/interfaces/IPoolSwapStructs.sol";


abstract contract BalancerExchange {

    int256 public constant MAX_VALUE = 10 ** 27;

    IVault private balancerVault;

    function setBalancerVault(address _balancerVault) internal {
        balancerVault = IVault(_balancerVault);
    }

    function swap(
        bytes32 poolId,
        IVault.SwapKind kind,
        IAsset tokenIn,
        IAsset tokenOut,
        address sender,
        address recipient,
        uint256 amount,
        uint256 limit
    ) internal returns (uint256) {

        IERC20(address(tokenIn)).approve(address(balancerVault), IERC20(address(tokenIn)).balanceOf(address(this)));

        IVault.SingleSwap memory singleSwap;
        singleSwap.poolId = poolId;
        singleSwap.kind = kind;
        singleSwap.assetIn = tokenIn;
        singleSwap.assetOut = tokenOut;
        singleSwap.amount = amount;

        IVault.FundManagement memory fundManagement;
        fundManagement.sender = sender;
        fundManagement.fromInternalBalance = false;
        fundManagement.recipient = payable(recipient);
        fundManagement.toInternalBalance = false;

        return balancerVault.swap(singleSwap, fundManagement, limit, block.timestamp + 600);
    }

    function swap(
        bytes32 poolId,
        IVault.SwapKind kind,
        IAsset tokenIn,
        IAsset tokenOut,
        address sender,
        address recipient,
        uint256 amount
    ) internal returns (uint256) {

        IERC20(address(tokenIn)).approve(address(balancerVault), IERC20(address(tokenIn)).balanceOf(address(this)));

        IVault.SingleSwap memory singleSwap;
        singleSwap.poolId = poolId;
        singleSwap.kind = kind;
        singleSwap.assetIn = tokenIn;
        singleSwap.assetOut = tokenOut;
        singleSwap.amount = amount;

        IVault.FundManagement memory fundManagement;
        fundManagement.sender = sender;
        fundManagement.fromInternalBalance = false;
        fundManagement.recipient = payable(recipient);
        fundManagement.toInternalBalance = false;

        return balancerVault.swap(singleSwap, fundManagement, uint256(MAX_VALUE), block.timestamp + 600);
    }

    function batchSwap(
        bytes32 poolId1,
        bytes32 poolId2,
        IVault.SwapKind kind,
        IAsset tokenIn,
        IAsset tokenMid,
        IAsset tokenOut,
        address sender,
        address payable recipient,
        uint256 amount
    ) internal returns (uint256) {

        IERC20(address(tokenIn)).approve(address(balancerVault), amount);

        IVault.BatchSwapStep[] memory swaps = new IVault.BatchSwapStep[](2);

        IVault.BatchSwapStep memory batchSwap1;
        batchSwap1.poolId = poolId1;
        batchSwap1.assetInIndex = 0;
        batchSwap1.assetOutIndex = 1;
        batchSwap1.amount = amount;
        swaps[0] = batchSwap1;

        IVault.BatchSwapStep memory batchSwap2;
        batchSwap2.poolId = poolId2;
        batchSwap2.assetInIndex = 1;
        batchSwap2.assetOutIndex = 2;
        batchSwap2.amount = 0;
        swaps[1] = batchSwap2;

        IAsset[] memory assets = new IAsset[](3);
        assets[0] = tokenIn;
        assets[1] = tokenMid;
        assets[2] = tokenOut;

        IVault.FundManagement memory fundManagement;
        fundManagement.sender = sender;
        fundManagement.fromInternalBalance = false;
        fundManagement.recipient = recipient;
        fundManagement.toInternalBalance = false;

        int256[] memory limits = new int256[](3);
        if (kind == IVault.SwapKind.GIVEN_IN) {
            limits[0] = MAX_VALUE;
            limits[1] = MAX_VALUE;
            limits[2] = MAX_VALUE;
        } else {
            limits[0] = 0;
            limits[1] = 0;
            limits[2] = 0;
        }

        return uint256(- balancerVault.batchSwap(kind, swaps, assets, fundManagement, limits, block.timestamp + 600)[2]);
    }

    function onSwap(
        bytes32 poolId,
        IVault.SwapKind kind,
        IERC20 tokenIn,
        IERC20 tokenOut,
        uint256 balance
    ) internal view returns (uint256) {

        IPoolSwapStructs.SwapRequest memory swapRequest;
        swapRequest.kind = kind;
        swapRequest.tokenIn = tokenIn;
        swapRequest.tokenOut = tokenOut;
        swapRequest.amount = balance;

        (IERC20[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock) = balancerVault.getPoolTokens(poolId);

        (address pool, IVault.PoolSpecialization poolSpecialization) = balancerVault.getPool(poolId);

        if (poolSpecialization == IVault.PoolSpecialization.GENERAL) {

            uint256 indexIn;
            uint256 indexOut;
            for (uint8 i = 0; i < tokens.length; i++) {
                if (tokens[i] == tokenIn) {
                    indexIn = i;
                } else if (tokens[i] == tokenOut) {
                    indexOut = i;
                }
            }

            return IGeneralPool(pool).onSwap(swapRequest, balances, indexIn, indexOut);

        } else if (poolSpecialization == IVault.PoolSpecialization.MINIMAL_SWAP_INFO) {

            uint256 balanceIn;
            uint256 balanceOut;
            for (uint8 i = 0; i < tokens.length; i++) {
                if (tokens[i] == tokenIn) {
                    balanceIn = balances[i];
                } else if (tokens[i] == tokenOut) {
                    balanceOut = balances[i];
                }
            }

            return IMinimalSwapInfoPool(pool).onSwap(swapRequest, balanceIn, balanceOut);

        } else {

            uint256 balanceIn;
            uint256 balanceOut;
            for (uint8 i = 0; i < tokens.length; i++) {
                if (tokens[i] == tokenIn) {
                    balanceIn = balances[i];
                } else if (tokens[i] == tokenOut) {
                    balanceOut = balances[i];
                }
            }

            return IMinimalSwapInfoPool(pool).onSwap(swapRequest, balanceIn, balanceOut);
        }
    }

    /**
     * Get amount of token1 nominated in token0 where amount0Total is total getting amount nominated in token0
     *
     * precision: 0 - no correction, 1 - one correction (recommended value), 2 or more - several corrections
     */
    function _getAmountToSwap(
        uint256 amount0Total,
        uint256 reserve0,
        uint256 reserve1,
        uint256 denominator0,
        uint256 denominator1,
        uint256 precision,
        bytes32 poolId,
        IERC20 token0,
        IERC20 token1
    ) internal view returns (uint256) {
        uint256 amount0ToSwap = (amount0Total * reserve1) / (reserve0 * denominator1 / denominator0 + reserve1);
        for (uint i = 0; i < precision; i++) {
            uint256 amount1 = onSwap(poolId, IVault.SwapKind.GIVEN_IN, token0, token1, amount0ToSwap);
            amount0ToSwap = (amount0Total * reserve1) / (reserve0 * amount1 / amount0ToSwap + reserve1);
        }

        return amount0ToSwap;
    }

    /**
     * Get amount of lp tokens where amount0Total is total getting amount nominated in token0
     *
     * precision: 0 - no correction, 1 - one correction (recommended value), 2 or more - several corrections
     */
    function _getAmountLpTokensToWithdraw(
        uint256 amount0Total,
        uint256 reserve0,
        uint256 reserve1,
        uint256 totalLpBalance,
        uint256 denominator0,
        uint256 denominator1,
        bytes32 poolId,
        IERC20 token0,
        IERC20 token1
    ) internal view returns (uint256) {
        uint256 lpBalance = (totalLpBalance * amount0Total * denominator1) / (reserve0 * denominator1 + reserve1 * denominator0);
        for (uint i = 0; i < 1; i++) {
            uint256 amount1 = reserve1 * lpBalance / totalLpBalance;
            uint256 amount0 = onSwap(poolId, IVault.SwapKind.GIVEN_IN, token1, token0, amount1);
            lpBalance = (totalLpBalance * amount0Total * amount1) / (reserve0 * amount1 + reserve1 * amount0);
        }
        return lpBalance;
    }

    uint256[49] private __gap;
}
