// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ISoluneaRouter01 {
    struct Route {
        address from;
        address to;
        bool stable;
    }

    function quoteLiquidity(
        uint256 amountA,
        uint256 reserveA,
        uint256 reserveB
    ) external pure returns (uint256 amountB);

    function getReserves(
        address tokenA,
        address tokenB,
        bool stable
    ) external view returns (uint256 reserveA, uint256 reserveB);

    /// @dev Performs chained getAmountOut calculations on any number of pairs.
    function getAmountOut(
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) external view returns (uint256 amount, bool stable);

    function getExactAmountOut(
        uint256 amountIn,
        address tokenIn,
        address tokenOut,
        bool stable
    ) external view returns (uint256);

    /// @dev Performs chained getAmountOut calculations on any number of pairs.
    function getAmountsOut(
        uint256 amountIn,
        Route[] memory routes
    ) external view returns (uint256[] memory amounts);

    function isPair(address pair) external view returns (bool);

    function quoteAddLiquidity(
        address tokenA,
        address tokenB,
        bool stable,
        uint256 amountADesired,
        uint256 amountBDesired
    ) external view returns (uint256 amountA, uint256 amountB, uint256 liquidity);

    function quoteRemoveLiquidity(
        address tokenA,
        address tokenB,
        bool stable,
        uint256 liquidity
    ) external view returns (uint256 amountA, uint256 amountB);

    function addLiquidity(
        address tokenA,
        address tokenB,
        bool stable,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);

    function addLiquidityETH(
        address token,
        bool stable,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);

    // **** REMOVE LIQUIDITY ****

    function removeLiquidity(
        address tokenA,
        address tokenB,
        bool stable,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);

    function removeLiquidityETH(
        address token,
        bool stable,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountToken, uint256 amountETH);

    function removeLiquidityWithPermit(
        address tokenA,
        address tokenB,
        bool stable,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 amountA, uint256 amountB);

    function removeLiquidityETHWithPermit(
        address token,
        bool stable,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 amountToken, uint256 amountETH);

    function removeLiquidityETHSupportingFeeOnTransferTokens(
        address token,
        bool stable,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountFTMMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountToken, uint256 amountFTM);

    function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
        address token,
        bool stable,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountFTMMin,
        address to,
        uint256 deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 amountToken, uint256 amountFTM);

    function swapExactTokensForTokensSimple(
        uint256 amountIn,
        uint256 amountOutMin,
        address tokenFrom,
        address tokenTo,
        bool stable,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        Route[] calldata routes,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapExactETHForTokens(
        uint256 amountOutMin,
        Route[] calldata routes,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        Route[] calldata routes,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        Route[] calldata routes,
        address to,
        uint256 deadline
    ) external;

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint256 amountOutMin,
        Route[] calldata routes,
        address to,
        uint256 deadline
    ) external payable;

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        Route[] calldata routes,
        address to,
        uint256 deadline
    ) external;
}

interface ISoluneaPair {
    // Structure to capture time period obervations every 30 minutes, used for local oracles
    struct Observation {
        uint timestamp;
        uint reserve0Cumulative;
        uint reserve1Cumulative;
    }

    function permit(
        address owner,
        address spender,
        uint value,
        uint deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;

    function burn(address to) external returns (uint amount0, uint amount1);

    function balanceOf(address) external view returns (uint);

    function mint(address to) external returns (uint liquidity);

    function getReserves()
        external
        view
        returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast);

    function getAmountOut(uint, address) external view returns (uint);

    function claimFees() external returns (uint, uint);

    function totalSupply() external view returns (uint);

    function tokens() external view returns (address, address);

    function token0() external view returns (address);

    function token1() external view returns (address);

    function stable() external view returns (bool);

    function approve(address spender, uint256 amount) external returns (bool);

    function observationLength() external view returns (uint256);

    function observations(uint index) external view returns (Observation memory observation);

    function metadata()
        external
        view
        returns (uint dec0, uint dec1, uint r0, uint r1, bool st, address t0, address t1);
}

interface ISoluneaGauge {
    function claimFees() external returns (uint256 claimed0, uint256 claimed1);

    function getReward(address account, address[] memory tokens) external;

    function balanceOf(address) external view returns (uint);

    function rewardTokensLength() external view returns (uint);

    function rewardTokens(uint256) external view returns (address);

    function depositAll(uint256 tokenId) external;

    function deposit(uint256 amount, uint256 tokenId) external;

    function withdrawAll() external;

    function withdraw(uint256 amount) external;

    function withdrawToken(uint256 amount, uint256 tokenId) external;

    function notifyRewardAmount(address token, uint256 amount) external;
}

library SoluneaLibrary {
    function getAmountsOut(
        ISoluneaRouter01 router,
        address inputToken,
        address outputToken,
        bool isStablePair0,
        uint256 amountInput
    ) internal view returns (uint256) {
        ISoluneaRouter01.Route[] memory routes = new ISoluneaRouter01.Route[](1);
        routes[0].from = inputToken;
        routes[0].to = outputToken;
        routes[0].stable = isStablePair0;

        uint[] memory amounts = router.getAmountsOut(amountInput, routes);

        return amounts[1];
    }

    function getAmountsOut(
        ISoluneaRouter01 router,
        address inputToken,
        address middleToken,
        address outputToken,
        bool isStablePair0,
        bool isStablePair1,
        uint256 amountInput
    ) internal view returns (uint256) {
        ISoluneaRouter01.Route[] memory routes = new ISoluneaRouter01.Route[](2);
        routes[0].from = inputToken;
        routes[0].to = middleToken;
        routes[0].stable = isStablePair0;
        routes[1].from = middleToken;
        routes[1].to = outputToken;
        routes[1].stable = isStablePair1;

        uint[] memory amounts = router.getAmountsOut(amountInput, routes);

        return amounts[2];
    }

    function singleSwap(
        ISoluneaRouter01 router,
        address inputToken,
        address outputToken,
        bool isStablePair0,
        uint256 amountInput,
        uint256 amountOutMin,
        address recipient
    ) internal returns (uint256) {
        IERC20(inputToken).approve(address(router), amountInput);

        ISoluneaRouter01.Route[] memory routes = new ISoluneaRouter01.Route[](1);
        routes[0].from = inputToken;
        routes[0].to = outputToken;
        routes[0].stable = isStablePair0;

        uint[] memory amounts = router.swapExactTokensForTokens(
            amountInput,
            amountOutMin,
            routes,
            recipient,
            block.timestamp
        );

        return amounts[1];
    }

    function multiSwap(
        ISoluneaRouter01 router,
        address inputToken,
        address middleToken,
        address outputToken,
        bool isStablePair0,
        bool isStablePair1,
        uint256 amountInput,
        uint256 amountOutMin,
        address recipient
    ) internal returns (uint256) {
        IERC20(inputToken).approve(address(router), amountInput);

        ISoluneaRouter01.Route[] memory routes = new ISoluneaRouter01.Route[](2);
        routes[0].from = inputToken;
        routes[0].to = middleToken;
        routes[0].stable = isStablePair0;
        routes[1].from = middleToken;
        routes[1].to = outputToken;
        routes[1].stable = isStablePair1;

        uint[] memory amounts = router.swapExactTokensForTokens(
            amountInput,
            amountOutMin,
            routes,
            recipient,
            block.timestamp
        );

        return amounts[2];
    }

    function getMultiAmount0(
        ISoluneaRouter01 router,
        address token0,
        address token1,
        address token2,
        uint256 amount0Total,
        bool isStable0,
        bool isStable1,
        uint256 reserve0,
        uint256 reserve1,
        uint256 denominator0,
        uint256 denominator1,
        uint256 precision
    ) internal view returns (uint256 amount0) {
        amount0 = (amount0Total * reserve1) / ((reserve0 * denominator1) / denominator0 + reserve1);
        for (uint i = 0; i < precision; i++) {
            uint256 amount1 = getAmountsOut(
                router,
                token0,
                token1,
                token2,
                isStable0,
                isStable1,
                amount0
            );
            amount0 = (amount0Total * reserve1) / ((reserve0 * amount1) / amount0 + reserve1);
        }
    }

    struct CalculateMultiParams {
        ISoluneaRouter01 router;
        address token0;
        address token1;
        address token2;
        uint256 amount0Total;
        uint256 totalAmountLpTokens;
        bool isStable0;
        bool isStable1;
        uint256 reserve0;
        uint256 reserve1;
        uint256 denominator0;
        uint256 denominator1;
        uint256 precision;
    }

    /**
     * Get amount of lp tokens where amount0Total is total getting amount nominated in token0
     *
     * precision: 0 - no correction, 1 - one correction (recommended value), 2 or more - several corrections
     */
    function getAmountLpTokens(
        CalculateMultiParams memory params
    ) internal view returns (uint256 amountLpTokens) {
        amountLpTokens =
            (params.totalAmountLpTokens * params.amount0Total * params.denominator1) /
            (params.reserve0 * params.denominator1 + params.reserve1 * params.denominator0);
        for (uint i = 0; i < params.precision; i++) {
            uint256 amount1 = (params.reserve1 * amountLpTokens) / params.totalAmountLpTokens;

            uint256 amount0 = getAmountsOut(
                params.router,
                params.token2,
                params.token1,
                params.token0,
                params.isStable1,
                params.isStable0,
                amount1
            );
            amountLpTokens =
                (params.totalAmountLpTokens * params.amount0Total * amount1) /
                (params.reserve0 * amount1 + params.reserve1 * amount0);
        }
    }
}
