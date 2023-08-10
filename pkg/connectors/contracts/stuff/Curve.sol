// SPDX-License-Identifier: GPL-3.0-or-later
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

pragma solidity >=0.8.0 <0.9.0;
pragma experimental ABIEncoderV2;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


interface ICurveExchange {

    /**
        @notice Perform an exchange using the pool that offers the best rate
        @dev Prior to calling this function, the caller must approve
        this contract to transfer `_amount` coins from `_from`
        Does NOT check rates in factory-deployed pools
        @param _from Address of coin being sent
        @param _to Address of coin being received
        @param _amount Quantity of `_from` being sent
        @param _expected Minimum quantity of `_from` received
        in order for the transaction to succeed
        @param _receiver Address to transfer the received tokens to
        @return uint256 Amount received
    */
    function exchange_with_best_rate(address _from, address _to, uint256 _amount, uint256 _expected, address _receiver) external returns (uint256);

    function exchange_with_best_rate(address _from, address _to, uint256 _amount, uint256 _expected) external returns (uint256);

    /**
        @notice Perform an exchange using a specific pool
        @dev Prior to calling this function, the caller must approve
             this contract to transfer `_amount` coins from `_from`
             Works for both regular and factory-deployed pools
        @param _pool Address of the pool to use for the swap
        @param _from Address of coin being sent
        @param _to Address of coin being received
        @param _amount Quantity of `_from` being sent
        @param _expected Minimum quantity of `_from` received
               in order for the transaction to succeed
        @param _receiver Address to transfer the received tokens to
        @return uint256 Amount received
    */
    function exchange(address _pool, address _from, address _to, uint256 _amount, uint256 _expected, address _receiver) external returns (uint256);

    function exchange(address _pool, address _from, address _to, uint256 _amount, uint256 _expected) external returns (uint256);

    /**
        @notice Perform up to four swaps in a single transaction
        @dev Routing and swap params must be determined off-chain. This
             functionality is designed for gas efficiency over ease-of-use.
        @param _route Array of [initial token, pool, token, pool, token, ...]
                      The array is iterated until a pool address of 0x00, then the last
                      given token is transferred to `_receiver`
        @param _swap_params Multidimensional array of [i, j, swap type] where i and j are the correct
                            values for the n'th pool in `_route`. The swap type should be
                            1 for a stableswap `exchange`,
                            2 for stableswap `exchange_underlying`,
                            3 for a cryptoswap `exchange`,
                            4 for a cryptoswap `exchange_underlying`,
                            5 for factory metapools with lending base pool `exchange_underlying`,
                            6 for factory crypto-meta pools underlying exchange (`exchange` method in zap),
                            7-11 for wrapped coin (underlying for lending or fake pool) -> LP token "exchange" (actually `add_liquidity`),
                            12-14 for LP token -> wrapped coin (underlying for lending pool) "exchange" (actually `remove_liquidity_one_coin`)
                            15 for WETH -> ETH "exchange" (actually deposit/withdraw)
        @param _amount The amount of `_route[0]` token being sent.
        @param _expected The minimum amount received after the final swap.
        @param _pools Array of pools for swaps via zap contracts. This parameter is only needed for
                      Polygon meta-factories underlying swaps.
        @param _receiver Address to transfer the final output token to.
        @return Received amount of the final output token
    */
    function exchange_multiple(address[9] memory _route, uint256[3][4] memory _swap_params, uint256 _amount, uint256 _expected, address[4] memory _pools, address _receiver) external returns (uint256);

    function exchange_multiple(address[9] memory _route, uint256[3][4] memory _swap_params, uint256 _amount, uint256 _expected, address[4] memory _pools) external returns (uint256);

    function exchange_multiple(address[9] memory _route, uint256[3][4] memory _swap_params, uint256 _amount, uint256 _expected) external returns (uint256);

    /**
        @notice Find the pool offering the best rate for a given swap.
        @dev Checks rates for regular and factory pools
        @param _from Address of coin being sent
        @param _to Address of coin being received
        @param _amount Quantity of `_from` being sent
        @param _exclude_pools A list of up to 8 addresses which shouldn't be returned
        @return Pool address, amount received
    */
    function get_best_rate(address _from, address _to, uint256 _amount, address[8] memory _exclude_pools) external returns (address, uint256);

    function get_best_rate(address _from, address _to, uint256 _amount) external returns (address, uint256);

    /**
        @notice Get the current number of coins received in an exchange
        @dev Works for both regular and factory-deployed pools
        @param _pool Pool address
        @param _from Address of coin to be sent
        @param _to Address of coin to be received
        @param _amount Quantity of `_from` to be sent
        @return Quantity of `_to` to be received
    */
    function get_exchange_amount(address _pool, address _from, address _to, uint256 _amount) external returns (uint256);

    /**
        @notice Get the current number of coins required to receive the given amount in an exchange
        @param _pool Pool address
        @param _from Address of coin to be sent
        @param _to Address of coin to be received
        @param _amount Quantity of `_to` to be received
        @return Quantity of `_from` to be sent
    */
    function get_input_amount(address _pool, address _from, address _to, uint256 _amount) external returns (uint256);

    /**
        @notice Get the current number of coins required to receive the given amount in an exchange
        @param _pool Pool address
        @param _from Address of coin to be sent
        @param _to Address of coin to be received
        @param _amounts Quantity of `_to` to be received
        @return Quantity of `_from` to be sent
    */
    function get_exchange_amounts(address _pool, address _from, address _to, uint256[100] memory _amounts) external returns (uint256[100] memory);

    /**
        @notice Get the current number the final output tokens received in an exchange
        @dev Routing and swap params must be determined off-chain. This
             functionality is designed for gas efficiency over ease-of-use.
        @param _route Array of [initial token, pool, token, pool, token, ...]
                      The array is iterated until a pool address of 0x00, then the last
                      given token is transferred to `_receiver`
        @param _swap_params Multidimensional array of [i, j, swap type] where i and j are the correct
                            values for the n'th pool in `_route`. The swap type should be
                            1 for a stableswap `exchange`,
                            2 for stableswap `exchange_underlying`,
                            3 for a cryptoswap `exchange`,
                            4 for a cryptoswap `exchange_underlying`,
                            5 for factory metapools with lending base pool `exchange_underlying`,
                            6 for factory crypto-meta pools underlying exchange (`exchange` method in zap),
                            7-11 for wrapped coin (underlying for lending pool) -> LP token "exchange" (actually `add_liquidity`),
                            12-14 for LP token -> wrapped coin (underlying for lending or fake pool) "exchange" (actually `remove_liquidity_one_coin`)
                            15 for WETH -> ETH "exchange" (actually deposit/withdraw)
        @param _amount The amount of `_route[0]` token to be sent.
        @param _pools Array of pools for swaps via zap contracts. This parameter is only needed for
                      Polygon meta-factories underlying swaps.
        @return Expected amount of the final output token
    */
    function get_exchange_multiple_amount(address[9] memory _route, uint256[3][4] memory _swap_params, uint256 _amount, address[4] memory _pools) external returns (uint256);

    function get_exchange_multiple_amount(address[9] memory _route, uint256[3][4] memory _swap_params, uint256 _amount) external returns (uint256);

}

interface IStableSwapPool {

    function add_liquidity(uint256[3] memory _amounts, uint256 _min_mint_amount, bool _use_underlying) external returns (uint256);

    function add_liquidity(uint256[2] memory _amounts, uint256 _min_mint_amount) external returns (uint256);

    function remove_liquidity(uint256 _amount, uint256[3] memory _min_amounts, bool _use_underlying) external returns (uint256[3] memory);

    function remove_liquidity(uint256 _amount, uint256[2] memory _min_amounts) external returns (uint256[2] memory);

    function underlying_coins(uint256 i) external view returns (address);

    function lp_token() external view returns (address);

    function calc_token_amount(uint256[3] memory _amounts, bool _is_deposit) external view returns (uint256);

    function calc_token_amount(uint256[2] memory _amounts, bool _is_deposit) external view returns (uint256);

    function coins(uint256 i) external view returns (address);

    function balances(uint256 i) external view returns (uint256);

    function get_balances() external view returns (uint256[2] memory);

    function get_virtual_price() external view returns (uint256);

    function balanceOf(address _address) external view returns (uint256);

    // Get the amount of coin j(received) one would receive for swapping _dx of coin i(send).
    function get_dy(int128 sendToken, int128 receivedToken, uint256 _dx) external view returns (uint256);

    function get_dy_underlying(int128 sendToken, int128 receivedToken, uint256 _dx) external view returns (uint256);

    //Perform an exchange between two coins.
    // i: Index value for the coin to send
    // j: Index value of the coin to receive
    // _dx: Amount of i being exchanged
    // _min_dy: Minimum amount of j to receive
    // Returns the actual amount of coin j received. Index values can be found via the coins public getter method.
    function exchange(int128 sendToken, int128 receivedToken, uint256 _dx, uint256 _min_dy) external returns (uint256);

    function exchange_underlying(int128 sendToken, int128 receivedToken, uint256 _dx, uint256 _min_dy) external returns (uint256);

    function calc_withdraw_one_coin(uint256 _token_amount, int128 i) external view returns (uint256);

    function remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 _min_amount) external returns (uint256);

    function remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 _min_amount, bool _use_underlying) external returns (uint256);

    function approve(address _spender, uint256 _value) external returns (bool);

}

interface IMetaSwapPool {

    // Get the amount of coin j(received) one would receive for swapping _dx of coin i(send).
    function get_dy(address _pool, int128 sendToken, int128 receivedToken, uint256 _dx) external view returns (uint256);

    function get_dy_underlying(address _pool, int128 sendToken, int128 receivedToken, uint256 _dx) external view returns (uint256);

    //Perform an exchange between two coins.
    // i: Index value for the coin to send
    // j: Index value of the coin to receive
    // _dx: Amount of i being exchanged
    // _min_dy: Minimum amount of j to receive
    // Returns the actual amount of coin j received. Index values can be found via the coins public getter method.
    function exchange(address _pool, int128 sendToken, int128 receivedToken, uint256 _dx, uint256 _min_dy) external returns (uint256);

    function exchange_underlying(address _pool, int128 sendToken, int128 receivedToken, uint256 _dx, uint256 _min_dy) external returns (uint256);
}

interface IRewardsOnlyGauge is IERC20 {

    function deposit(uint256 _value, address _addr, bool _claim_rewards) external;

    function deposit(uint256 _value, address _addr) external;

    function deposit(uint256 _value, bool _claim_rewards) external;

    function deposit(uint256 _value) external;

    function withdraw(uint256 _value, bool _claim_rewards) external;

    function withdraw(uint256 _value) external;

    function lp_token() external view returns (address);

    function claim_rewards(address _addr, address _receiver) external;

    function claim_rewards(address _addr) external;

    function claim_rewards() external;

    function claimed_reward(address _addr, address _token) external returns (uint256);

    function claimable_reward(address _addr, address _token) external returns (uint256);

    function claimable_reward_write(address _addr, address _token) external returns (uint256);
}

library CurveMetaLibrary {

    function swapByIndex(
        int128  indexIn,
        int128  indexOut,
        bool isUnderlying,
        uint256 amountIn,
        uint256 amountMinOut,
        address meta,
        address pool
    ) internal returns (uint256) {

        uint256 backAmount;
        if (isUnderlying) {
            backAmount = IMetaSwapPool(meta).exchange_underlying(
                pool,
                indexIn,
                indexOut,
                amountIn,
                amountMinOut
            );
        } else {
            backAmount = IMetaSwapPool(meta).exchange(
                pool,
                indexIn,
                indexOut,
                amountIn,
                amountMinOut
            );
        }

        return backAmount;
    }

    function getAmountOutByIndex(
        int128 indexIn,
        int128 indexOut,
        bool isUnderlying,
        uint256 amountIn,
        address meta,
        address pool
    ) internal view returns (uint256) {
        if (isUnderlying) {
            return IMetaSwapPool(meta).get_dy_underlying(pool,indexIn, indexOut, amountIn);
        } else {
            return IMetaSwapPool(meta).get_dy(pool,indexIn, indexOut, amountIn);
        }
    }
}

library CurveLibrary {

    function singleSwap(
        address curveExchange,
        address token0,
        address pool0,
        address token1,
        uint256 amount0,
        uint256 amount1Out
    ) internal returns (uint256) {
        IERC20(token0).approve(curveExchange, amount0);
        return ICurveExchange(curveExchange).exchange(pool0, token0, token1, amount0, amount1Out);
    }

    function multiSwap(
        address curveExchange,
        address token0,
        address pool0,
        address token1,
        address pool1,
        address token2,
        uint256 amount0,
        uint256 amount2Out
    ) internal returns (uint256) {
        IERC20(token0).approve(curveExchange, amount0);
        address[9] memory route;
        route[0] = token0;
        route[1] = pool0;
        route[2] = token1;
        route[3] = pool1;
        route[4] = token2;
        uint256[3][4] memory swap_params;
        return ICurveExchange(curveExchange).exchange_multiple(route, swap_params, amount0, amount2Out);
    }

    function swap(
        address pool,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountMinOut
    ) internal returns (uint256) {
        IERC20(tokenIn).approve(pool, amountIn);
        (int128 indexIn, int128 indexOut, bool isUnderlying) = getIndexes(pool, tokenIn, tokenOut);

        uint256 backAmount;
        if (isUnderlying) {
            backAmount = IStableSwapPool(pool).exchange_underlying(
                indexIn,
                indexOut,
                amountIn,
                amountMinOut
            );
        } else {
            backAmount = IStableSwapPool(pool).exchange(
                indexIn,
                indexOut,
                amountIn,
                amountMinOut
            );
        }

        return backAmount;
    }

    function getAmountOut(
        address pool,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) internal view returns (uint256) {
        (int128 indexIn, int128 indexOut, bool isUnderlying) = getIndexes(pool, tokenIn, tokenOut);
        if (isUnderlying) {
            return IStableSwapPool(pool).get_dy_underlying(indexIn, indexOut, amountIn);
        } else {
            return IStableSwapPool(pool).get_dy(indexIn, indexOut, amountIn);
        }
    }

    function getIndexes(
        address pool,
        address tokenIn,
        address tokenOut
    ) internal view returns (int128, int128, bool) {
        int128 indexIn = type(int128).max;
        int128 indexOut = type(int128).max;

        // search in coins list
        uint256 i;
        while (true) {
            address token = getCoin(pool, i);
            if (token == address(0)) {
                break;
            }

            if (token == tokenIn) {
                indexIn = int128(uint128(i));
            } else if (token == tokenOut) {
                indexOut = int128(uint128(i));
            }
            i++;
        }

        if (indexIn != type(int128).max && indexOut != type(int128).max) {
            return (indexIn, indexOut, false);
        }

        if (indexIn != type(int128).max || indexOut != type(int128).max) {
            // one of tokens found in coins but not found another - it is incorrect
            // setup case for token pairs
            revert("CurveSP: incorrect token pair setup");
        }

        // search in underlying coins list
        i = 0;
        while (true) {
            address token = getUnderlyingCoin(pool, i);
            if (token == address(0)) {
                break;
            }

            if (token == tokenIn) {
                indexIn = int128(uint128(i));
            } else if (token == tokenOut) {
                indexOut = int128(uint128(i));
            }
            i++;
        }

        if (indexIn != type(int128).max && indexOut != type(int128).max) {
            return (indexIn, indexOut, true);
        }

        revert("CurveSP: Can't find index for tokens in pool");
    }

    function getCoin(address pool, uint256 index) internal view returns (address) {
        try IStableSwapPool(pool).coins(index) returns (address tokenAddress) {
            return tokenAddress;
        } catch {}
        return address(0);
    }

    function getUnderlyingCoin(address pool, uint256 index) internal view returns (address) {
        try IStableSwapPool(pool).underlying_coins(index) returns (address tokenAddress) {
            return tokenAddress;
        } catch {}
        return address(0);
    }

    /**
     * Get amount of token1 nominated in token0 where amount0Total is total getting amount nominated in token0
     *
     * precision: 0 - no correction, 1 - one correction (recommended value), 2 or more - several corrections
     */
    function getAmountToSwap(
        address pool,
        address token0,
        address token1,
        uint256 amount0Total,
        uint256 reserve0,
        uint256 reserve1,
        uint256 denominator0,
        uint256 denominator1,
        uint256 precision
    ) internal view returns (uint256 amount0) {
        amount0 = (amount0Total * reserve1) / (reserve0 * denominator1 / denominator0 + reserve1);
        for (uint i = 0; i < precision; i++) {
            uint256 amount1 = getAmountOut(pool, token0, token1, amount0);
            amount0 = (amount0Total * reserve1) / (reserve0 * amount1 / amount0 + reserve1);
        }
    }

    /**
     * Get amount of lp tokens where amount0Total is total getting amount nominated in token0
     *
     * precision: 0 - no correction, 1 - one correction (recommended value), 2 or more - several corrections
     */
    function getAmountLpTokens(
        address pool,
        address token0,
        address token1,
        uint256 amount0Total,
        uint256 totalAmountLpTokens,
        uint256 reserve0,
        uint256 reserve1,
        uint256 denominator0,
        uint256 denominator1,
        uint256 precision
    ) internal view returns (uint256 amountLpTokens) {
        amountLpTokens = (totalAmountLpTokens * amount0Total * denominator1) / (reserve0 * denominator1 + reserve1 * denominator0);
        for (uint i = 0; i < precision; i++) {
            uint256 amount1 = reserve1 * amountLpTokens / totalAmountLpTokens;
            uint256 amount0 = getAmountOut(pool, token1, token0, amount1);
            amountLpTokens = (totalAmountLpTokens * amount0Total * amount1) / (reserve0 * amount1 + reserve1 * amount0);
        }
    }

}
