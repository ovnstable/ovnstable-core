// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import '@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol';

interface IBasePositionManager {
    struct Position {
        // the nonce for permits
        uint96 nonce;
        // the address that is approved for spending this token
        address operator;
        // the ID of the pool with which this token is connected
        uint80 poolId;
        // the tick range of the position
        int24 tickLower;
        int24 tickUpper;
        // the liquidity of the position
        uint128 liquidity;
        // the current rToken that the position owed
        uint256 rTokenOwed;
        // fee growth per unit of liquidity as of the last update to liquidity
        uint256 feeGrowthInsideLast;
    }

    struct PoolInfo {
        address token0;
        uint24 fee;
        address token1;
    }

    /// @notice Params for the first time adding liquidity, mint new nft to sender
    /// @param token0 the token0 of the pool
    /// @param token1 the token1 of the pool
    ///   - must make sure that token0 < token1
    /// @param fee the pool's fee in bps
    /// @param tickLower the position's lower tick
    /// @param tickUpper the position's upper tick
    ///   - must make sure tickLower < tickUpper, and both are in tick distance
    /// @param ticksPrevious the nearest tick that has been initialized and lower than or equal to
    ///   the tickLower and tickUpper, use to help insert the tickLower and tickUpper if haven't initialized
    /// @param amount0Desired the desired amount for token0
    /// @param amount1Desired the desired amount for token1
    /// @param amount0Min min amount of token 0 to add
    /// @param amount1Min min amount of token 1 to add
    /// @param recipient the owner of the position
    /// @param deadline time that the transaction will be expired
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        int24[2] ticksPrevious;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }

    /// @notice Params for adding liquidity to the existing position
    /// @param tokenId id of the position to increase its liquidity
    /// @param amount0Desired the desired amount for token0
    /// @param amount1Desired the desired amount for token1
    /// @param amount0Min min amount of token 0 to add
    /// @param amount1Min min amount of token 1 to add
    /// @param deadline time that the transaction will be expired
    struct IncreaseLiquidityParams {
        uint256 tokenId;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    /// @notice Params for remove liquidity from the existing position
    /// @param tokenId id of the position to remove its liquidity
    /// @param amount0Min min amount of token 0 to receive
    /// @param amount1Min min amount of token 1 to receive
    /// @param deadline time that the transaction will be expired
    struct RemoveLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    /// @notice Burn the rTokens to get back token0 + token1 as fees
    /// @param tokenId id of the position to burn r token
    /// @param amount0Min min amount of token 0 to receive
    /// @param amount1Min min amount of token 1 to receive
    /// @param deadline time that the transaction will be expired
    struct BurnRTokenParams {
        uint256 tokenId;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    /// @notice Creates a new pool if it does not exist, then unlocks if it has not been unlocked
    /// @param token0 the token0 of the pool
    /// @param token1 the token1 of the pool
    /// @param fee the fee for the pool
    /// @param currentSqrtP the initial price of the pool
    /// @return pool returns the pool address
    function createAndUnlockPoolIfNecessary(
        address token0,
        address token1,
        uint24 fee,
        uint160 currentSqrtP
    ) external payable returns (address pool);

    function mint(MintParams calldata params)
    external
    payable
    returns (
        uint256 tokenId,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );

    function addLiquidity(IncreaseLiquidityParams calldata params)
    external
    payable
    returns (
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1,
        uint256 additionalRTokenOwed
    );

    function removeLiquidity(RemoveLiquidityParams calldata params)
    external
    returns (
        uint256 amount0,
        uint256 amount1,
        uint256 additionalRTokenOwed
    );

    function burnRTokens(BurnRTokenParams calldata params)
    external
    returns (
        uint256 rTokenQty,
        uint256 amount0,
        uint256 amount1
    );

    /**
     * @dev Burn the token by its owner
   * @notice All liquidity should be removed before burning
   */
    function burn(uint256 tokenId) external payable;

    function positions(uint256 tokenId)
    external
    view
    returns (Position memory pos, PoolInfo memory info);

    function addressToPoolId(address pool) external view returns (uint80);

    function isRToken(address token) external view returns (bool);

    function nextPoolId() external view returns (uint80);

    function nextTokenId() external view returns (uint256);

    /**
     * @dev Returns true if this contract implements the interface defined by
   * `interfaceId`. See the corresponding
   * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[EIP section]
   * to learn more about how these ids are created.
   *
   * This function call must use less than 30 000 gas.
   */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}


interface IKyberSwapElasticLM {
    struct RewardData {
        address rewardToken;
        uint256 rewardUnclaimed;
    }

    struct LMPoolInfo {
        address poolAddress;
        uint32 startTime;
        uint32 endTime;
        uint32 vestingDuration;
        uint256 totalSecondsClaimed; // scaled by (1 << 96)
        RewardData[] rewards;
        uint256 feeTarget;
        uint256 numStakes;
    }

    struct PositionInfo {
        address owner;
        uint256 liquidity;
    }

    struct StakeInfo {
        uint256 secondsPerLiquidityLast;
        uint256[] rewardLast;
        uint256[] rewardPending;
        uint256[] rewardHarvested;
        uint256 feeFirst;
        uint256 liquidity;
    }

    // input data in harvestMultiplePools function
    struct HarvestData {
        uint256[] pIds;
    }

    // avoid stack too deep error
    struct RewardCalculationData {
        uint256 secondsPerLiquidityNow;
        uint256 feeNow;
        uint256 vestingVolume;
        uint256 totalSecondsUnclaimed;
        uint256 secondsPerLiquidity;
        uint256 secondsClaim; // scaled by (1 << 96)
    }

    /**
     * @dev Add new pool to LM
   * @param poolAddr pool address
   * @param startTime start time of liquidity mining
   * @param endTime end time of liquidity mining
   * @param vestingDuration time locking in reward locker
   * @param rewardTokens reward token list for pool
   * @param rewardAmounts reward amount of list token
   * @param feeTarget fee target for pool
   **/
    function addPool(
        address poolAddr,
        uint32 startTime,
        uint32 endTime,
        uint32 vestingDuration,
        address[] calldata rewardTokens,
        uint256[] calldata rewardAmounts,
        uint256 feeTarget
    ) external;

    /**
     * @dev Renew a pool to start another LM program
   * @param pId pool id to update
   * @param startTime start time of liquidity mining
   * @param endTime end time of liquidity mining
   * @param vestingDuration time locking in reward locker
   * @param rewardAmounts reward amount of list token
   * @param feeTarget fee target for pool
   **/
    function renewPool(
        uint256 pId,
        uint32 startTime,
        uint32 endTime,
        uint32 vestingDuration,
        uint256[] calldata rewardAmounts,
        uint256 feeTarget
    ) external;

    /**
     * @dev Deposit NFT
   * @param nftIds list nft id
   **/
    function deposit(uint256[] calldata nftIds) external;

    /**
     * @dev Withdraw NFT, must exit all pool before call.
   * @param nftIds list nft id
   **/
    function withdraw(uint256[] calldata nftIds) external;

    /**
     * @dev Join pools
   * @param pId pool id to join
   * @param nftIds nfts to join
   * @param liqs list liquidity value to join each nft
   **/
    function join(
        uint256 pId,
        uint256[] calldata nftIds,
        uint256[] calldata liqs
    ) external;

    /**
     * @dev Exit from pools
   * @param pId pool ids to exit
   * @param nftIds list nfts id
   * @param liqs list liquidity value to exit from each nft
   **/
    function exit(
        uint256 pId,
        uint256[] calldata nftIds,
        uint256[] calldata liqs
    ) external;

    /**
     * @dev Claim rewards for a list of pools for a list of nft positions
   * @param nftIds List of NFT ids to harvest
   * @param datas List of pool ids to harvest for each nftId, encoded into bytes
   */
    function harvestMultiplePools(uint256[] calldata nftIds, bytes[] calldata datas) external;

    /**
     * @dev Operator only. Call to enable withdraw emergency withdraw for user.
   * @param canWithdraw list pool ids to join
   **/
    function enableWithdraw(bool canWithdraw) external;

    /**
     * @dev Operator only. Call to withdraw all reward from list pools.
   * @param rewards list reward address erc20 token
   * @param amounts amount to withdraw
   **/
    function emergencyWithdrawForOwner(address[] calldata rewards, uint256[] calldata amounts)
    external;

    /**
     * @dev Withdraw NFT, can call any time, reward will be reset. Must enable this func by operator
   * @param pIds list pool to withdraw
   **/
    function emergencyWithdraw(uint256[] calldata pIds) external;

    function nft() external view returns (IERC721);

    function stakes(uint256 nftId, uint256 pId)
    external
    view
    returns (
        uint256 secondsPerLiquidityLast,
        uint256 feeFirst,
        uint256 liquidity
    );

    function poolLength() external view returns (uint256);

    function getUserInfo(uint256 nftId, uint256 pId)
    external
    view
    returns (
        uint256 liquidity,
        uint256[] memory rewardPending,
        uint256[] memory rewardLast
    );

    function getPoolInfo(uint256 pId)
    external
    view
    returns (
        address poolAddress,
        uint32 startTime,
        uint32 endTime,
        uint32 vestingDuration,
        uint256 totalSecondsClaimed,
        uint256 feeTarget,
        uint256 numStakes,
    //index reward => reward data
        address[] memory rewardTokens,
        uint256[] memory rewardUnclaimeds
    );

    function getDepositedNFTs(address user) external view returns (uint256[] memory listNFTs);

    function getRewardCalculationData(uint256 nftId, uint256 pId)
    external
    view
    returns (RewardCalculationData memory data);
}


/// @notice Functions for swapping tokens via KyberSwap v2
/// - Support swap with exact input or exact output
/// - Support swap with a price limit
/// - Support swap within a single pool and between multiple pools
interface IRouter {
    /// @dev Params for swapping exact input amount
    /// @param tokenIn the token to swap
    /// @param tokenOut the token to receive
    /// @param fee the pool's fee
    /// @param recipient address to receive tokenOut
    /// @param deadline time that the transaction will be expired
    /// @param amountIn the tokenIn amount to swap
    /// @param amountOutMinimum the minimum receive amount
    /// @param limitSqrtP the price limit, if reached, stop swapping
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 minAmountOut;
        uint160 limitSqrtP;
    }

    /// @notice Swaps `amountIn` of one token for as much as possible of another token
    /// @param params The parameters necessary for the swap, encoded as `ExactInputSingleParams` in calldata
    /// @return amountOut The amount of the received token
    function swapExactInputSingle(ExactInputSingleParams calldata params)
    external
    payable
    returns (uint256 amountOut);

    /// @dev Params for swapping exact input using multiple pools
    /// @param path the encoded path to swap from tokenIn to tokenOut
    ///   If the swap is from token0 -> token1 -> token2, then path is encoded as [token0, fee01, token1, fee12, token2]
    /// @param recipient address to receive tokenOut
    /// @param deadline time that the transaction will be expired
    /// @param amountIn the tokenIn amount to swap
    /// @param amountOutMinimum the minimum receive amount
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 minAmountOut;
    }

    /// @notice Swaps `amountIn` of one token for as much as possible of another along the specified path
    /// @param params The parameters necessary for the multi-hop swap, encoded as `ExactInputParams` in calldata
    /// @return amountOut The amount of the received token
    function swapExactInput(ExactInputParams calldata params)
    external
    payable
    returns (uint256 amountOut);

    /// @dev Params for swapping exact output amount
    /// @param tokenIn the token to swap
    /// @param tokenOut the token to receive
    /// @param fee the pool's fee
    /// @param recipient address to receive tokenOut
    /// @param deadline time that the transaction will be expired
    /// @param amountOut the tokenOut amount of tokenOut
    /// @param amountInMaximum the minimum input amount
    /// @param limitSqrtP the price limit, if reached, stop swapping
    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 maxAmountIn;
        uint160 limitSqrtP;
    }

    /// @notice Swaps as little as possible of one token for `amountOut` of another token
    /// @param params The parameters necessary for the swap, encoded as `ExactOutputSingleParams` in calldata
    /// @return amountIn The amount of the input token
    function swapExactOutputSingle(ExactOutputSingleParams calldata params)
    external
    payable
    returns (uint256 amountIn);

    /// @dev Params for swapping exact output using multiple pools
    /// @param path the encoded path to swap from tokenIn to tokenOut
    ///   If the swap is from token0 -> token1 -> token2, then path is encoded as [token2, fee12, token1, fee01, token0]
    /// @param recipient address to receive tokenOut
    /// @param deadline time that the transaction will be expired
    /// @param amountOut the tokenOut amount of tokenOut
    /// @param amountInMaximum the minimum input amount
    struct ExactOutputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 maxAmountIn;
    }

    /// @notice Swaps as little as possible of one token for `amountOut` of another along the specified path (reversed)
    /// @param params The parameters necessary for the multi-hop swap, encoded as `ExactOutputParams` in calldata
    /// @return amountIn The amount of the input token
    function swapExactOutput(ExactOutputParams calldata params)
    external
    payable
    returns (uint256 amountIn);
}

library KyberSwapLibrary {

    function singleSwap(
        IRouter router,
        address tokenIn,
        address tokenOut,
        uint24 fee,
        address recipient,
        uint256 amountIn,
        uint256 minAmountOut
    ) internal returns (uint256 amountOut) {

        IERC20(tokenIn).approve(address(router), amountIn);

        IRouter.ExactInputSingleParams memory params = IRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: recipient,
            deadline: block.timestamp,
            amountIn: amountIn,
            minAmountOut: minAmountOut,
            limitSqrtP: 0
        });

        amountOut = router.swapExactInputSingle(params);
    }

    function multiSwap(
        IRouter router,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee0,
        uint24 fee1,
        address recipient,
        uint256 amountIn,
        uint256 minAmountOut
    ) internal returns (uint256 amountOut) {

        IERC20(tokenIn).approve(address(router), amountIn);

        IRouter.ExactInputParams memory params = IRouter.ExactInputParams({
            path: abi.encodePacked(tokenIn, fee0, tokenMid, fee1, tokenOut),
            recipient: recipient,
            deadline: block.timestamp,
            amountIn: amountIn,
            minAmountOut: minAmountOut
        });

        amountOut = router.swapExactInput(params);
    }
}
