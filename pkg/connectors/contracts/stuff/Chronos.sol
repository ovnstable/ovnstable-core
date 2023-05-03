// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IChronosRouter {

    struct route {
        address from;
        address to;
        bool stable;
    }

    // fetches and sorts the reserves for a pair
    function getReserves(address tokenA, address tokenB, bool stable) external view returns (uint reserveA, uint reserveB);

    // performs chained getAmountOut calculations on any number of pairs
    function getAmountOut(uint amountIn, address tokenIn, address tokenOut) external view returns (uint amount, bool stable);

    // performs chained getAmountOut calculations on any number of pairs
    function getAmountsOut(uint amountIn, route[] memory routes) external view returns (uint[] memory amounts);

    function quoteAddLiquidity(
        address tokenA,
        address tokenB,
        bool stable,
        uint amountADesired,
        uint amountBDesired
    ) external view returns (uint amountA, uint amountB, uint liquidity);

    function quoteRemoveLiquidity(
        address tokenA,
        address tokenB,
        bool stable,
        uint liquidity
    ) external view returns (uint amountA, uint amountB);

    function addLiquidity(
        address tokenA,
        address tokenB,
        bool stable,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);

    function addLiquidityETH(
        address token,
        bool stable,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);

    function removeLiquidity(
        address tokenA,
        address tokenB,
        bool stable,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB);

    function removeLiquidityETH(
        address token,
        bool stable,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external returns (uint amountToken, uint amountETH);

    function removeLiquidityWithPermit(
        address tokenA,
        address tokenB,
        bool stable,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external returns (uint amountA, uint amountB);

    function removeLiquidityETHWithPermit(
        address token,
        bool stable,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external returns (uint amountToken, uint amountETH);

    function swapExactTokensForTokensSimple(
        uint amountIn,
        uint amountOutMin,
        address tokenFrom,
        address tokenTo,
        bool stable,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        route[] calldata routes,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function swapExactETHForTokens(uint amountOutMin, route[] calldata routes, address to, uint deadline)
    external
    payable
    returns (uint[] memory amounts);

    function swapExactTokensForETH(uint amountIn, uint amountOutMin, route[] calldata routes, address to, uint deadline)
    external
    returns (uint[] memory amounts);

}

interface IChronosPair {
    function getReserves() external view returns (uint _reserve0, uint _reserve1, uint _blockTimestampLast);
    function getAmountOut(uint, address) external view returns (uint);
    function balanceOf(address) external view returns (uint);
    function approve(address spender, uint amount) external returns (bool);
    function totalSupply() external view returns (uint);
    function token0() external view returns (address);
}

interface IChronosGauge {

    function deposit(uint256 amount) external returns(uint _tokenId);

    function balanceOf(address) external view returns (uint);

    function getReward(uint _tokenId) external ;

    function harvestAndMerge(uint _from, uint _to) external;

    function _depositEpoch(uint _tokenId) external view returns (uint256);

    function withdrawAndHarvestAll() external;

    function getAllReward() external;

    function weightOfToken(uint _tokenId) external view returns (uint256);

    function balanceOfToken(uint tokenId)  external view returns (uint256);

    function maturityLevelOfTokenMaxBoost(uint _tokenId) external view returns (uint _matLevel);

    function harvestAndSplit(uint[] memory amounts, uint _tokenId) external;

    function withdrawAndHarvest(uint _tokenId) external;
}

interface IChronosNFT is IERC721 {

    function maGaugeTokensOfOwner(address _owner, address _gauge) external view returns (uint256[] memory);
}

library ChronosLibrary {

    function getAmountsOut(
        IChronosRouter router,
        address inputToken,
        address outputToken,
        bool isStablePair0,
        uint256 amountInput
    ) internal view returns (uint256) {

        IChronosRouter.route[] memory routes = new IChronosRouter.route[](1);
        routes[0].from = inputToken;
        routes[0].to = outputToken;
        routes[0].stable = isStablePair0;

        uint[] memory amounts = router.getAmountsOut(amountInput, routes);

        return amounts[1];
    }

    function getAmountsOut(
        IChronosRouter router,
        address inputToken,
        address middleToken,
        address outputToken,
        bool isStablePair0,
        bool isStablePair1,
        uint256 amountInput
    ) internal view returns (uint256) {

        IChronosRouter.route[] memory routes = new IChronosRouter.route[](2);
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
        IChronosRouter router,
        address inputToken,
        address outputToken,
        bool isStablePair0,
        uint256 amountInput,
        uint256 amountOutMin,
        address recipient
    ) internal returns (uint256) {

        IERC20(inputToken).approve(address(router), amountInput);

        IChronosRouter.route[] memory routes = new IChronosRouter.route[](1);
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
        IChronosRouter router,
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

        IChronosRouter.route[] memory routes = new IChronosRouter.route[](2);
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
        IChronosRouter router,
        address token0,
        address token1,
        address token2,
        uint256 amount0Total,
        bool    isStable0,
        bool    isStable1,
        uint256 reserve0,
        uint256 reserve1,
        uint256 denominator0,
        uint256 denominator1,
        uint256 precision
    ) internal view returns (uint256 amount0) {
        amount0 = (amount0Total * reserve1) / (reserve0 * denominator1 / denominator0 + reserve1);
        for (uint i = 0; i < precision; i++) {
            uint256 amount1 = getAmountsOut(router, token0, token1, token2,  isStable0, isStable1, amount0);
            amount0 = (amount0Total * reserve1) / (reserve0 * amount1 / amount0 + reserve1);
        }
    }


    struct CalculateMultiParams {
        IChronosRouter router;
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
        amountLpTokens = (params.totalAmountLpTokens * params.amount0Total * params.denominator1) / (params.reserve0 * params.denominator1 + params.reserve1 * params.denominator0);
        for (uint i = 0; i < params.precision; i++) {
            uint256 amount1 = params.reserve1 * amountLpTokens / params.totalAmountLpTokens;

            uint256 amount0 = getAmountsOut(params.router, params.token2, params.token1, params.token0,  params.isStable1, params.isStable0, amount1);
            amountLpTokens = (params.totalAmountLpTokens * params.amount0Total * amount1) / (params.reserve0 * amount1 + params.reserve1 * amount0);
        }
    }

}
