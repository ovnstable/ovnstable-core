// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IRouter {

    struct route {
        address from;
        address to;
        bool stable;
    }

    function sortTokens(address tokenA, address tokenB) external pure returns (address token0, address token1);

    // calculates the CREATE2 address for a pair without making any external calls
    function pairFor(address tokenA, address tokenB, bool stable) external view returns (address pair);

    // fetches and sorts the reserves for a pair
    function getReserves(address tokenA, address tokenB, bool stable) external view returns (uint reserveA, uint reserveB);

    // performs chained getAmountOut calculations on any number of pairs
    function getAmountOut(uint amountIn, address tokenIn, address tokenOut) external view returns (uint amount, bool stable);

    //@override
    //getAmountOut	:	bool stable
    //Gets exact output for specific pair-type(S|V)
    function getAmountOut(uint amountIn, address tokenIn, address tokenOut, bool stable) external view returns (uint amount);

    // performs chained getAmountOut calculations on any number of pairs
    function getAmountsOut(uint amountIn, route[] memory routes) external view returns (uint[] memory amounts);

    function isPair(address pair) external view returns (bool);

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

    // **** REMOVE LIQUIDITY ****
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

    // **** SWAP ****
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

    function UNSAFE_swapExactTokensForTokens(
        uint[] memory amounts,
        route[] calldata routes,
        address to,
        uint deadline
    ) external returns (uint[] memory);

}

interface IPair {
    function metadata() external view returns (uint dec0, uint dec1, uint r0, uint r1, bool st, address t0, address t1);
    function tokens() external view returns (address, address);
    function token0() external returns (address);
    function token1() external returns (address);
    function externalBribe() external returns (address);
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address src, address dst, uint amount) external returns (bool);
    function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external;
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
    function burn(address to) external returns (uint amount0, uint amount1);
    function mint(address to) external returns (uint liquidity);
    function getReserves() external view returns (uint _reserve0, uint _reserve1, uint _blockTimestampLast);
    function getAmountOut(uint, address) external view returns (uint);
    function setHasGauge(bool value) external;
    function setExternalBribe(address _externalBribe) external;
    function hasGauge() external view returns (bool);
    function stable() external view returns (bool);
    function prices(address tokenIn, uint amountIn, uint points) external view returns (uint[] memory);
}

interface IGauge {

    function totalSupply() external view returns (uint256);

    function balanceOf(address) external view returns (uint);

    function getReward(address account, address[] memory tokens) external;

    function stake() external view returns (address _pool);

    function rewardPerToken(address token) external view returns (uint);

    function derivedBalance(address account) external view returns (uint);

    function batchRewardPerToken(address token, uint maxRuns) external;

    /// @dev Update stored rewardPerToken values without the last one snapshot
    ///      If the contract will get "out of gas" error on users actions this will be helpful
    function batchUpdateRewardPerToken(address token, uint maxRuns) external;

    // earned is an estimation, it won't be exact till the supply > rewardPerToken calculations have run
    function earned(address token, address account) external view returns (uint);

    function depositAll(uint tokenId) external;

    function deposit(uint amount, uint tokenId) external;

    function withdrawAll() external;

    function withdraw(uint amount) external;

    function withdrawToken(uint amount, uint tokenId) external;

    function left(address token) external view returns (uint);

    function notifyRewardAmount(address token, uint amount) external;

}

/// @title Option Token
/// @notice Option token representing the right to purchase the underlying token
/// at TWAP reduced rate. Similar to call options but with a variable strike
/// price that's always at a certain discount to the market price.
/// @dev Assumes the underlying token and the payment token both use 18 decimals and revert on
// failure to transfer.
interface IOptionToken is IERC20 {

    /// @notice The token paid by the options token holder during redemption
    function paymentToken() external view returns (address);

    /// @notice The underlying token purchased during redemption
    function underlyingToken() external view returns (address);

    /// @notice The voting escrow for locking FLOW to veFLOW
    function votingEscrow() external view returns (address);

    /// @notice The voter contract
    function voter() external view returns (address);

    /// @notice The router for adding liquidity
    function router() external view returns (address); // this should not be immutable

    /// @notice The pair contract that provides the current TWAP price to purchase
    /// the underlying token while exercising options (the strike price)
    function pair() external view returns (address);

    /// @notice The guage contract for the pair
    function gauge() external view returns (address);

    /// @notice The treasury address which receives tokens paid during redemption
    function treasury() external view returns (address);

    /// @notice The VM address which receives tokens paid during redemption
    function vmTreasury() external view returns (address);

    /// @notice the discount given during exercising with locking to the LP
    function maxLPDiscount() external view returns (uint256); //  User pays 20%
    function minLPDiscount() external view returns (uint256); //  User pays 80%

    /// @notice the discount given during exercising. 30 = user pays 30%
    function discount() external view returns (uint256); // User pays 90%

    /// @notice the discount for locking to veFLOW
    function veDiscount() external view returns (uint256); // User pays 10%

    /// @notice the lock duration for max discount to create locked LP
    function lockDurationForMaxLpDiscount() external view returns (uint256); // 52 weeks

    // @notice the lock duration for max discount to create locked LP
    function lockDurationForMinLpDiscount() external view returns (uint256); // 1 week

    /// @notice Exercises options tokens to purchase the underlying tokens.
    /// @dev The oracle may revert if it cannot give a secure result.
    /// @param _amount The amount of options tokens to exercise
    /// @param _maxPaymentAmount The maximum acceptable amount to pay. Used for slippage protection.
    /// @param _recipient The recipient of the purchased underlying tokens
    /// @return The amount paid to the treasury to purchase the underlying tokens
    function exercise(
        uint256 _amount,
        uint256 _maxPaymentAmount,
        address _recipient
    ) external returns (uint256);

    /// @notice Exercises options tokens to purchase the underlying tokens.
    /// @dev The oracle may revert if it cannot give a secure result.
    /// @param _amount The amount of options tokens to exercise
    /// @param _maxPaymentAmount The maximum acceptable amount to pay. Used for slippage protection.
    /// @param _recipient The recipient of the purchased underlying tokens
    /// @param _deadline The Unix timestamp (in seconds) after which the call will revert
    /// @return The amount paid to the treasury to purchase the underlying tokens
    function exercise(
        uint256 _amount,
        uint256 _maxPaymentAmount,
        address _recipient,
        uint256 _deadline
    ) external returns (uint256);

    /// @notice Exercises options tokens to purchase the underlying tokens.
    /// @dev The oracle may revert if it cannot give a secure result.
    /// @param _amount The amount of options tokens to exercise
    /// @param _maxPaymentAmount The maximum acceptable amount to pay. Used for slippage protection.
    /// @param _recipient The recipient of the purchased underlying tokens
    /// @param _deadline The Unix timestamp (in seconds) after which the call will revert
    /// @return The amount paid to the treasury to purchase the underlying tokens
    function exerciseVe(
        uint256 _amount,
        uint256 _maxPaymentAmount,
        address _recipient,
        uint256 _deadline
    ) external returns (uint256, uint256);

    /// @notice Exercises options tokens to create LP and stake in gauges with lock.
    /// @dev The oracle may revert if it cannot give a secure result.
    /// @param _amount The amount of options tokens to exercise
    /// @param _maxPaymentAmount The maximum acceptable amount to pay. Used for slippage protection.
    /// @param _discount The desired discount
    /// @param _deadline The Unix timestamp (in seconds) after which the call will revert
    /// @return The amount paid to the treasury to purchase the underlying tokens

    function exerciseLp(
        uint256 _amount,
        uint256 _maxPaymentAmount,
        address _recipient,
        uint256 _discount,
        uint256 _deadline
    ) external returns (uint256, uint256);

    /// @notice Returns the discounted price in paymentTokens for a given amount of options tokens
    /// @param _amount The amount of options tokens to exercise
    /// @return The amount of payment tokens to pay to purchase the underlying tokens
    function getDiscountedPrice(uint256 _amount) external view returns (uint256);

    /// @notice Returns the discounted price in paymentTokens for a given amount of options tokens redeemed to veFLOW
    /// @param _amount The amount of options tokens to exercise
    /// @return The amount of payment tokens to pay to purchase the underlying tokens
    function getVeDiscountedPrice(
        uint256 _amount
    ) external view returns (uint256);

    /// @notice Returns the discounted price in paymentTokens for a given amount of options tokens redeemed to veFLOW
    /// @param _amount The amount of options tokens to exercise
    /// @param _discount The discount amount
    /// @return The amount of payment tokens to pay to purchase the underlying tokens
    function getLpDiscountedPrice(
        uint256 _amount,
        uint256 _discount
    ) external view returns (uint256);

    /// @notice Returns the lock duration for a desired discount to create locked LP
    ///
    function getLockDurationForLpDiscount(
        uint256 _discount
    ) external view returns (uint256 duration);

    // @notice Returns the amount in paymentTokens for a given amount of options tokens required for the LP exercise lp
    /// @param _amount The amount of options tokens to exercise
    /// @param _discount The discount amount
    function getPaymentTokenAmountForExerciseLp(uint256 _amount,uint256 _discount) external view returns (uint256 paymentAmount, uint256 paymentAmountToAddLiquidity);

    function getSlopeInterceptForLpDiscount()
    external
    view
    returns (int256 slope, int256 intercept);

    /// @notice Returns the average price in payment tokens over 2 hours for a given amount of underlying tokens
    /// @param _amount The amount of underlying tokens to purchase
    /// @return The amount of payment tokens
    function getTimeWeightedAveragePrice(
        uint256 _amount
    ) external view returns (uint256);
}

library VelocimeterLibrary {

    function getAmountOut(
        address velocimeterRouter,
        address inputToken,
        address outputToken,
        bool isStablePair0,
        uint256 amountInput
    ) internal view returns (uint256) {

        IRouter.route[] memory routes = new IRouter.route[](1);
        routes[0].from = inputToken;
        routes[0].to = outputToken;
        routes[0].stable = isStablePair0;

        uint256[] memory amounts = IRouter(velocimeterRouter).getAmountsOut(amountInput, routes);

        return amounts[1];
    }

    function getAmountOut(
        address velocimeterRouter,
        address inputToken,
        address middleToken,
        address outputToken,
        bool isStablePair0,
        bool isStablePair1,
        uint256 amountInput
    ) internal view returns (uint256) {

        IRouter.route[] memory routes = new IRouter.route[](2);
        routes[0].from = inputToken;
        routes[0].to = middleToken;
        routes[0].stable = isStablePair0;
        routes[1].from = middleToken;
        routes[1].to = outputToken;
        routes[1].stable = isStablePair1;

        uint256[] memory amounts = IRouter(velocimeterRouter).getAmountsOut(amountInput, routes);

        return amounts[2];
    }

    function singleSwap(
        address velocimeterRouter,
        address inputToken,
        address outputToken,
        bool isStablePair0,
        uint256 amountInput,
        uint256 amountOutMin,
        address recipient
    ) internal returns (uint256) {

        IERC20(inputToken).approve(velocimeterRouter, amountInput);

        IRouter.route[] memory routes = new IRouter.route[](1);
        routes[0].from = inputToken;
        routes[0].to = outputToken;
        routes[0].stable = isStablePair0;

        uint256[] memory amounts = IRouter(velocimeterRouter).swapExactTokensForTokens(
            amountInput,
            amountOutMin,
            routes,
            recipient,
            block.timestamp
        );

        return amounts[1];
    }

    function multiSwap(
        address velocimeterRouter,
        address inputToken,
        address middleToken,
        address outputToken,
        bool isStablePair0,
        bool isStablePair1,
        uint256 amountInput,
        uint256 amountOutMin,
        address recipient
    ) internal returns (uint256) {

        IERC20(inputToken).approve(velocimeterRouter, amountInput);

        IRouter.route[] memory routes = new IRouter.route[](2);
        routes[0].from = inputToken;
        routes[0].to = middleToken;
        routes[0].stable = isStablePair0;
        routes[1].from = middleToken;
        routes[1].to = outputToken;
        routes[1].stable = isStablePair1;

        uint256[] memory amounts = IRouter(velocimeterRouter).swapExactTokensForTokens(
            amountInput,
            amountOutMin,
            routes,
            recipient,
            block.timestamp
        );

        return amounts[2];
    }
}
