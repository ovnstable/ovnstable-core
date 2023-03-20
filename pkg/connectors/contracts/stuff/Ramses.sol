// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IRamsesRouter {

    struct route {
        address from;
        address to;
        bool stable;
    }

    function sortTokens(address tokenA, address tokenB)
    external
    pure
    returns (address token0, address token1);

    // calculates the CREATE2 address for a pair without making any external calls
    function pairFor(
        address tokenA,
        address tokenB,
        bool stable
    ) external view returns (address pair);

    // fetches and sorts the reserves for a pair
    function getReserves(
        address tokenA,
        address tokenB,
        bool stable
    ) external view returns (uint256 reserveA, uint256 reserveB);

    // performs chained getAmountOut calculations on any number of pairs
    function getAmountOut(
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) external view returns (uint256 amount, bool stable);

    // performs chained getAmountOut calculations on any number of pairs
    function getAmountsOut(uint256 amountIn, route[] memory routes)
    external
    view
    returns (uint256[] memory amounts);

    function isPair(address pair) external view returns (bool);

    function quoteAddLiquidity(
        address tokenA,
        address tokenB,
        bool stable,
        uint256 amountADesired,
        uint256 amountBDesired
    )
    external
    view
    returns (
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );

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
    )
    external
    returns (
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );

    function addLiquidityETH(
        address token,
        bool stable,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
    external
    payable
    returns (
        uint256 amountToken,
        uint256 amountETH,
        uint256 liquidity
    );

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

    // **** SWAP ****

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
        route[] calldata routes,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapExactETHForTokens(
        uint256 amountOutMin,
        route[] calldata routes,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        route[] calldata routes,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function UNSAFE_swapExactTokensForTokens(
        uint256[] memory amounts,
        route[] calldata routes,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory);

}


interface IRamsesPair is IERC20Metadata {

    // Structure to capture time period obervations every 30 minutes, used for local oracles
    struct Observation {
        uint timestamp;
        uint reserve0Cumulative;
        uint reserve1Cumulative;
    }

    // Used to denote stable or volatile pair, not immutable since construction happens in the initialize method for CREATE2 deterministic addresses
    function stable() external view returns (bool);

    function token0() external view returns (address);

    function token1() external view returns (address);

    function fees() external view returns (address);

    function reserve0() external view returns (uint256);

    function reserve1() external view returns (uint256);

    function blockTimestampLast() external view returns (uint256);

    function reserve0CumulativeLast() external view returns (uint256);

    function reserve1CumulativeLast() external view returns (uint256);

    function observationLength() external view returns (uint256);

    function lastObservation() external view returns (Observation memory);

    function metadata()
    external
    view
    returns (
        uint256 dec0,
        uint256 dec1,
        uint256 r0,
        uint256 r1,
        bool st,
        address t0,
        address t1
    );

    function tokens() external view returns (address, address);

    /* Since the indexing system was removed, all fees must only go to the proper contracts for fee distribution.
    * If a gauge does not exist, fees will keep accruing inside the PairFees contract.
    * This function is unguarded and anybody can call it to push fees to the proper contracts.
    */
    function claimFees() external returns (uint, uint);

    function getReserves()
    external
    view
    returns (
        uint256 _reserve0,
        uint256 _reserve1,
        uint256 _blockTimestampLast
    );


    // produces the cumulative price using counterfactuals to save gas and avoid a call to sync.
    function currentCumulativePrices()
    external
    view
    returns (
        uint256 reserve0Cumulative,
        uint256 reserve1Cumulative,
        uint256 blockTimestamp
    );

    // gives the current twap price measured from amountIn * tokenIn gives amountOut
    function current(
        address tokenIn,
        uint256 amountIn
    ) external view returns (uint256 amountOut);

    // as per `current`, however allows user configured granularity, up to the full window size
    function quote(
        address tokenIn,
        uint256 amountIn,
        uint256 granularity
    ) external view returns (uint256 amountOut);

    // returns a memory set of twap prices
    function prices(
        address tokenIn,
        uint256 amountIn,
        uint256 points
    ) external view returns (uint256[] memory);

    function sample(
        address tokenIn,
        uint256 amountIn,
        uint256 points,
        uint256 window
    ) external view returns (uint256[] memory);

    // this low-level function should be called by addLiquidity functions in Router.sol, which performs important safety checks
    // standard uniswap v2 implementation
    function mint(address to) external returns (uint256 liquidity);

    // this low-level function should be called from a contract which performs important safety checks
    // standard uniswap v2 implementation
    function burn(
        address to
    ) external returns (uint256 amount0, uint256 amount1);

    // this low-level function should be called from a contract which performs important safety checks
    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external;

    // force balances to match reserves
    function skim(address to) external;

    // force reserves to match balances
    function sync() external;

    function getAmountOut(
        uint256 amountIn,
        address tokenIn
    ) external view returns (uint256);

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

}


interface IRamsesGauge {

    // the LP token that needs to be staked for rewards
    function stake() external view returns (address);

    // the ve token used for gauges
    function _ve() external view returns (address);

    function feeDistributor() external view returns (address);

    function voter() external view returns (address);

    function derivedSupply(address) external view returns (uint256);

    function pendingRewardRate(address) external view returns (uint256);

    function isStarted(address) external view returns (bool);

    function rewardRate(address) external view returns (uint256);

    function periodFinish(address) external view returns (uint256);

    function lastUpdateTime(address) external view returns (uint256);

    function rewardPerTokenStored(address) external view returns (uint256);

    function tokenIds(address) external view returns (uint256);

    function totalSupply() external view returns (uint256);

    function balanceOf(address) external view returns (uint256);

    function rewards() external view returns (address[] memory);

    function isReward(address) external view returns (bool);

    function isForPair() external view returns (bool);

    function claimFees()
    external
    returns (uint256 claimed0, uint256 claimed1);

    function rewardsListLength() external view returns (uint256);

    // returns the last time the reward was modified or periodFinish if the reward has ended
    function lastTimeRewardApplicable(
        address token
    ) external view returns (uint256);

    function earned(
        address token,
        address account
    ) external view returns (uint256);

    // Only the tokens you claim will get updated.
    function getReward(address account, address[] memory tokens) external;

    function rewardPerToken(address token) external view returns (uint256);

    function derivedBalance(address account) external view returns (uint256);

    function depositAll(uint256 tokenId) external;

    function deposit(uint256 amount, uint256 tokenId) external;

    function withdrawAll() external;

    function withdraw(uint256 amount) external;

    function withdrawToken(uint256 amount, uint256 tokenId) external;

    function left(address token) external view returns (uint256);

    // @dev rewardRate and periodFinish is set on first deposit if totalSupply == 0 or first interaction after whitelisting. If msg.sender == governance and totalSupply > 0 reward is started immediately.
    function notifyRewardAmount(address token, uint256 amount) external;

    function whitelistNotifiedRewards(address token) external;

    function getRewardTokenIndex(address token) external view returns (uint256);

    function removeRewardWhitelist(address token) external;

    function poke(address account) external;
}


library RamsesLibrary {

    function getAmountsOut(
        IRamsesRouter router,
        address inputToken,
        address outputToken,
        bool isStablePair0,
        uint256 amountInput
    ) internal view returns (uint256) {

        IRamsesRouter.route[] memory routes = new IRamsesRouter.route[](1);
        routes[0].from = inputToken;
        routes[0].to = outputToken;
        routes[0].stable = isStablePair0;

        return router.getAmountsOut(amountInput, routes)[1];
    }

    function getAmountsOut(
        IRamsesRouter router,
        address inputToken,
        address middleToken,
        address outputToken,
        bool isStablePair0,
        bool isStablePair1,
        uint256 amountInput
    ) internal view returns (uint256) {

        IRamsesRouter.route[] memory routes = new IRamsesRouter.route[](2);
        routes[0].from = inputToken;
        routes[0].to = middleToken;
        routes[0].stable = isStablePair0;
        routes[1].from = middleToken;
        routes[1].to = outputToken;
        routes[1].stable = isStablePair1;

        return router.getAmountsOut(amountInput, routes)[2];
    }

    function singleSwap(
        IRamsesRouter router,
        address inputToken,
        address outputToken,
        bool isStablePair0,
        uint256 amountInput,
        uint256 amountOutMin,
        address recipient
    ) internal returns (uint256) {

        IERC20(inputToken).approve(address(router), amountInput);

        IRamsesRouter.route[] memory routes = new IRamsesRouter.route[](1);
        routes[0].from = inputToken;
        routes[0].to = outputToken;
        routes[0].stable = isStablePair0;

        return router.swapExactTokensForTokens(
            amountInput,
            amountOutMin,
            routes,
            recipient,
            block.timestamp
        )[1];
    }

    function multiSwap(
        IRamsesRouter router,
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

        IRamsesRouter.route[] memory routes = new IRamsesRouter.route[](2);
        routes[0].from = inputToken;
        routes[0].to = middleToken;
        routes[0].stable = isStablePair0;
        routes[1].from = middleToken;
        routes[1].to = outputToken;
        routes[1].stable = isStablePair1;

        return router.swapExactTokensForTokens(
            amountInput,
            amountOutMin,
            routes,
            recipient,
            block.timestamp
        )[2];
    }
}
