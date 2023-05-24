// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";

interface IFactory {
    event PoolCreated(address poolAddress, uint256 fee, uint256 tickSpacing, int32 activeTick, int256 lookback, uint64 protocolFeeRatio, IERC20 tokenA, IERC20 tokenB);
    event SetFactoryProtocolFeeRatio(uint64 protocolFeeRatio);
    event SetFactoryOwner(address owner);
    /// @notice creates new pool
    /// @param _fee is a rate in prbmath 60x18 decimal format
    /// @param _tickSpacing  1.0001^tickSpacing is the bin width
    /// @param _activeTick initial activeTick of the pool
    /// @param _lookback TWAP lookback in whole seconds
    /// @param _tokenA ERC20 token
    /// @param _tokenB ERC20 token
    function create(
        uint256 _fee,
        uint256 _tickSpacing,
        int256 _lookback,
        int32 _activeTick,
        IERC20 _tokenA,
        IERC20 _tokenB
    ) external returns (IPool);
    function lookup(
        uint256 fee,
        uint256 tickSpacing,
        int256 lookback,
        IERC20 tokenA,
        IERC20 tokenB
    ) external view returns (IPool);
    function owner() external view returns (address);
    function position() external view returns (IPosition);
    /// @notice protocolFeeRatio ratio of the swap fee that is kept for the
    //protocol
    function protocolFeeRatio() external view returns (uint64);
    /// @notice lookup table for whether a pool is owned by the factory
    function isFactoryPool(IPool pool) external view returns (bool);
}

interface IPool {
    event Swap(address sender, address recipient, bool tokenAIn, bool exactOutput, uint256 amountIn, uint256 amountOut, int32 activeTick);
    event AddLiquidity(address indexed sender, uint256 indexed tokenId, BinDelta[] binDeltas);
    event MigrateBinsUpStack(address indexed sender, uint128 binId, uint32 maxRecursion);
    event TransferLiquidity(uint256 fromTokenId, uint256 toTokenId, RemoveLiquidityParams[] params);
    event RemoveLiquidity(address indexed sender, address indexed recipient, uint256 indexed tokenId, BinDelta[] binDeltas);
    event BinMerged(uint128 indexed binId, uint128 reserveA, uint128 reserveB, uint128 mergeId);
    event BinMoved(uint128 indexed binId, int128 previousTick, int128 newTick);
    event ProtocolFeeCollected(uint256 protocolFee, bool isTokenA);
    event SetProtocolFeeRatio(uint256 protocolFee);
    /// @notice return parameters for Add/Remove liquidity
    /// @param binId of the bin that changed
    /// @param kind one of the 4 Kinds (0=static, 1=right, 2=left, 3=both)
    /// @param isActive bool to indicate whether the bin is still active
    /// @param lowerTick is the lower price tick of the bin in its current state
    /// @param deltaA amount of A token that has been added or removed
    /// @param deltaB amount of B token that has been added or removed
    /// @param deltaLpToken amount of LP balance that has increase (add) or decreased (remove)
    struct BinDelta {
        uint128 deltaA;
        uint128 deltaB;
        uint256 deltaLpBalance;
        uint128 binId;
        uint8 kind;
        int32 lowerTick;
        bool isActive;
    }
    /// @notice time weighted average state
    /// @param twa the twa at the last update instant
    /// @param value the new value that was passed in at the last update
    /// @param lastTimestamp timestamp of the last update in seconds
    /// @param lookback time in seconds
    struct TwaState {
        int96 twa;
        int96 value;
        uint64 lastTimestamp;
    }
    /// @notice bin state parameters
    /// @param kind one of the 4 Kinds (0=static, 1=right, 2=left, 3=both)
    /// @param lowerTick is the lower price tick of the bin in its current state
    /// @param mergeId binId of the bin that this bin has merged in to
    /// @param reserveA amount of A token in bin
    /// @param reserveB amount of B token in bin
    /// @param totalSupply total amount of LP tokens in this bin
    /// @param mergeBinBalance LP token balance that this bin posseses of the merge bin
    struct BinState {
        uint128 reserveA;
        uint128 reserveB;
        uint128 mergeBinBalance;
        uint128 mergeId;
        uint128 totalSupply;
        uint8 kind;
        int32 lowerTick;
    }
    /// @notice Parameters for each bin that will get new liquidity
    /// @param kind one of the 4 Kinds (0=static, 1=right, 2=left, 3=both)
    /// @param pos bin position
    /// @param isDelta bool that indicates whether the bin position is relative
    //to the current bin or an absolute position
    /// @param deltaA amount of A token to add
    /// @param deltaB amount of B token to add
    struct AddLiquidityParams {
        uint8 kind;
        int32 pos;
        bool isDelta;
        uint128 deltaA;
        uint128 deltaB;
    }
    /// @notice Parameters for each bin that will have liquidity removed
    /// @param binId index of the bin losing liquidity
    /// @param amount LP balance amount to remove
    struct RemoveLiquidityParams {
        uint128 binId;
        uint128 amount;
    }
    /// @notice State of the pool
    /// @param activeTick  current bin position that contains the active bins
    /// @param status pool status.  e.g. locked or unlocked; status values
    //defined in Pool.sol
    /// @param binCounter index of the last bin created
    /// @param protocolFeeRatio ratio of the swap fee that is kept for the
    //protocol
    struct State {
        int32 activeTick;
        uint8 status;
        uint128 binCounter;
        uint64 protocolFeeRatio;
    }
    /// @notice fee for pool in 18 decimal format
    function fee() external view returns (uint256);
    /// @notice tickSpacing of pool where 1.0001^tickSpacing is the bin width
    function tickSpacing() external view returns (uint256);
    /// @notice address of token A
    function tokenA() external view returns (IERC20);
    /// @notice address of token B
    function tokenB() external view returns (IERC20);
    /// @notice address of Factory
    function factory() external view returns (IFactory);
    /// @notice bitmap of active bins
    function binMap(int32 tick) external view returns (uint256);
    /// @notice mapping of tick/kind to binId
    function binPositions(int32 tick, uint256 kind) external view returns (uint128);
    /// @notice internal accounting of the sum tokenA balance across bins
    function binBalanceA() external view returns (uint128);
    /// @notice internal accounting of the sum tokenB balance across bins
    function binBalanceB() external view returns (uint128);
    /// @notice Twa state values
    function getTwa() external view returns (TwaState memory);
    /// @notice log base binWidth of the time weighted average price
    function getCurrentTwa() external view returns (int256);
    /// @notice pool state
    function getState() external view returns (State memory);
    /// @notice Add liquidity to a pool.
    /// @param tokenId NFT token ID that will hold the position
    /// @param params array of AddLiquidityParams that specify the mode and
    //position of the liquidity
    /// @param data callback function that addLiquidity will call so that the
    //caller can transfer tokens
    function addLiquidity(
        uint256 tokenId,
        AddLiquidityParams[] calldata params,
        bytes calldata data
    )
    external
    returns (
        uint256 tokenAAmount,
        uint256 tokenBAmount,
        BinDelta[] memory binDeltas
    );
    /// @notice Transfer liquidity in an array of bins from one nft tokenId
    //to another
    /// @param fromTokenId NFT token ID that holds the position being transferred
    /// @param toTokenId NFT token ID that is receiving liquidity
    /// @param params array of binIds and amounts to transfer
    function transferLiquidity(
        uint256 fromTokenId,
        uint256 toTokenId,
        RemoveLiquidityParams[] calldata params
    ) external;
    /// @notice Remove liquidity from a pool.
    /// @param recipient address that will receive the removed tokens
    /// @param tokenId NFT token ID that holds the position being removed
    /// @param params array of RemoveLiquidityParams that specify the bins,
    //and amounts
    function removeLiquidity(
        address recipient,
        uint256 tokenId,
        RemoveLiquidityParams[] calldata params
    )
    external
    returns (
        uint256 tokenAOut,
        uint256 tokenBOut,
        BinDelta[] memory binDeltas
    );
    /// @notice Migrate bins up the linked list of merged bins so that its
    //mergeId is the currrent active bin.
    /// @param binId is an array of the binIds to be migrated
    /// @param maxRecursion is the maximum recursion depth of the migration. set to
    //zero to recurse until the active bin is found.
    function migrateBinUpStack(uint128 binId, uint32 maxRecursion) external;
    /// @notice swap tokens
    /// @param recipient address that will receive the output tokens
    /// @param amount amount of token that is either the input if exactOutput
    //is false or the output if exactOutput is true
    /// @param tokenAIn bool indicating whether tokenA is the input
    /// @param exactOutput bool indicating whether the amount specified is the
    //exact output amount (true)
    /// @param sqrtPriceLimit limiting sqrt price of the swap.  A value of 0
    //indicates no limit.  Limit is only engaged for exactOutput=false.  If the
    //limit is reached only part of the input amount will be swapped and the
    //callback will only require that amount of the swap to be paid.
    /// @param data callback function that swap will call so that the
    //caller can transfer tokens
    function swap(
        address recipient,
        uint256 amount,
        bool tokenAIn,
        bool exactOutput,
        uint256 sqrtPriceLimit,
        bytes calldata data
    ) external returns (uint256 amountIn, uint256 amountOut);
    /// @notice bin information for a given binId
    function getBin(uint128 binId) external view returns (BinState memory bin);
    /// @notice LP token balance for a given tokenId at a given binId
    function balanceOf(uint256 tokenId, uint128 binId) external view returns (uint256 lpToken);
    /// @notice tokenA scale value
    /// @dev msb is a flag to indicate whether tokenA has more or less than 18
    //decimals.  Scale is used in conjuction with Math.toScale/Math.fromScale
    //functions to convert from token amounts to D18 scale internal pool
    //accounting.
    function tokenAScale() external view returns (uint256);
    /// @notice tokenB scale value
    /// @dev msb is a flag to indicate whether tokenA has more or less than 18
    //decimals.  Scale is used in conjuction with Math.toScale/Math.fromScale
    //functions to convert from token amounts to D18 scale internal pool
    //accounting.
    function tokenBScale() external view returns (uint256);
}

interface IPosition is IERC721Enumerable {
    event SetMetadata(IPositionMetadata metadata);
    /// @notice mint new position NFT
    function mint(address to) external returns (uint256 tokenId);
    /// @notice mint new position NFT
    function tokenOfOwnerByIndexExists(address owner, uint256 index) external view returns (bool);
}

interface IPositionMetadata {
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

interface ISwapCallback {
    function swapCallback(
        uint256 amountIn,
        uint256 amountOut,
        bytes calldata data
    ) external;
}

/// @title Interface for WETH9
interface IWETH9 is IERC20 {
    /// @notice Deposit ether to get wrapped ether
    function deposit() external payable;

    /// @notice Withdraw wrapped ether to get ether
    function withdraw(uint256) external;
}

interface IMaverickRouter {
    /// @return Returns the address of WETH9
    function WETH9() external view returns (IWETH9);
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        IPool pool;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint256 sqrtPriceLimitD18;
    }
    /// @notice Swaps `amountIn` of one token for as much as possible of
    //another token
    /// @param params The parameters necessary for the swap, encoded as
    //`ExactInputSingleParams` in calldata
    /// @return amountOut The amount of the received token
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        IPool pool;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
    }
    /// @notice Swaps as little as possible of one token for `amountOut` of
    //another token
    /// @param params The parameters necessary for the swap, encoded as
    //`ExactOutputSingleParams` in calldata
    /// @return amountIn The amount of the input token
    function exactOutputSingle(ExactOutputSingleParams calldata params) external payable returns (uint256 amountIn);
    /// @notice Unwraps the contract's WETH9 balance and sends it to recipient as ETH.
    /// @dev The amountMinimum parameter prevents malicious contracts from stealing WETH9 from users.
    /// @param amountMinimum The minimum amount of WETH9 to unwrap
    /// @param recipient The address receiving ETH
    function unwrapWETH9(uint256 amountMinimum, address recipient) external payable;
    /// @notice Refunds any ETH balance held by this contract to the `msg.sender`
    /// @dev Useful for bundling with mint or increase liquidity that uses ether, or exact output swaps
    /// that use ether for the input amount
    function refundETH() external payable;
    /// @notice Transfers the full amount of a token held by this contract to recipient
    /// @dev The amountMinimum parameter prevents malicious contracts from stealing the token from users
    /// @param token The contract address of the token which will be transferred to `recipient`
    /// @param amountMinimum The minimum amount of token required for a transfer
    /// @param recipient The destination address of the token
    function sweepToken(IERC20 token, uint256 amountMinimum, address recipient) external payable;
    /// @return Returns the address of the factory
    function factory() external view returns (IFactory);
    /// @return Returns the address of the Position NFT
    function position() external view returns (IPosition);
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }
    /// @notice Swaps `amountIn` of one token for as much as possible of
    //another along the specified path
    /// @param params The parameters necessary for the multi-hop swap, encoded
    //as `ExactInputParams` in calldata
    /// @return amountOut The amount of the received token
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
    struct ExactOutputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
    }
    /// @notice Swaps as little as possible of one token for `amountOut` of
    //another along the specified path (reversed)
    /// @param params The parameters necessary for the multi-hop swap, encoded
    //as `ExactOutputParams` in calldata
    /// @return amountIn The amount of the input token
    function exactOutput(ExactOutputParams calldata params) external payable returns (uint256 amountIn);
    struct PoolParams {
        uint256 fee;
        uint256 tickSpacing;
        int256 lookback;
        int32 activeTick;
        IERC20 tokenA;
        IERC20 tokenB;
    }
    /// @notice create a pool and add liquidity to it
    /// @param poolParams paramters of a pool
    /// @param tokenId nft id of token that will hold lp balance, use 0 to mint a new token
    /// @param addParams paramters of liquidity addition
    /// @param minTokenAAmount minimum amount of token A to add, revert if not met
    /// @param minTokenBAmount minimum amount of token B to add, revert if not met
    /// @param deadline epoch timestamp in seconds
    function getOrCreatePoolAndAddLiquidity(
        PoolParams calldata poolParams,
        uint256 tokenId,
        IPool.AddLiquidityParams[] calldata addParams,
        uint256 minTokenAAmount,
        uint256 minTokenBAmount,
        uint256 deadline
    ) external payable returns (uint256 receivingTokenId, uint256 tokenAAmount, uint256 tokenBAmount, IPool.BinDelta[] memory binDeltas);
    /// @notice add liquidity to a pool
    /// @param pool pool to add liquidity to
    /// @param tokenId nft id of token that will hold lp balance, use 0 to mint a new token
    /// @param params paramters of liquidity addition
    /// @param minTokenAAmount minimum amount of token A to add, revert if not met
    /// @param minTokenBAmount minimum amount of token B to add, revert if not met
    /// @param deadline epoch timestamp in seconds
    function addLiquidityToPool(
        IPool pool,
        uint256 tokenId,
        IPool.AddLiquidityParams[] calldata params,
        uint256 minTokenAAmount,
        uint256 minTokenBAmount,
        uint256 deadline
    ) external payable returns (uint256 receivingTokenId, uint256 tokenAAmount, uint256 tokenBAmount, IPool.BinDelta[] memory binDeltas);
    /// @notice add liquidity to a pool with active tick limits
    /// @param pool pool to add liquidity to
    /// @param tokenId nft id of token that will hold lp balance, use 0 to mint a new token
    /// @param params paramters of liquidity addition
    /// @param minTokenAAmount minimum amount of token A to add, revert if not met
    /// @param minTokenBAmount minimum amount of token B to add, revert if not met
    /// @param minActiveTick lowest activeTick (inclusive) of pool that will permit transaction to pass
    /// @param maxActiveTick highest activeTick (inclusive) of pool that will permit transaction to pass
    /// @param deadline epoch timestamp in seconds
    function addLiquidityWTickLimits(
        IPool pool,
        uint256 tokenId,
        IPool.AddLiquidityParams[] calldata params,
        uint256 minTokenAAmount,
        uint256 minTokenBAmount,
        int32 minActiveTick,
        int32 maxActiveTick,
        uint256 deadline
    ) external payable returns (uint256 receivingTokenId, uint256 tokenAAmount, uint256 tokenBAmount, IPool.BinDelta[] memory binDeltas);
    /// @notice moves the head of input merged bins to the active bin
    /// @param pool to remove from
    /// @param binIds array of bin Ids to migrate
    /// @param maxRecursion maximum recursion depth before returning; 0=no max
    /// @param deadline epoch timestamp in seconds
    function migrateBinsUpStack(IPool pool, uint128[] calldata binIds, uint32 maxRecursion, uint256 deadline) external;
    /// @notice remove liquidity from pool and receive WETH if one of the tokens is WETH
    /// @dev router must be approved for the withdrawing tokenId: Position.approve(router, tokenId)
    /// @param pool pool to remove from
    /// @param recipient address where proceeds are sent; use zero or router address to leave tokens in router
    /// @param tokenId ID of position NFT that holds liquidity
    /// @param params paramters of liquidity removal
    /// @param minTokenAAmount minimum amount of token A to receive, revert if not met
    /// @param minTokenBAmount minimum amount of token B to receive, revert if not met
    /// @param deadline epoch timestamp in seconds
    function removeLiquidity(
        IPool pool,
        address recipient,
        uint256 tokenId,
        IPool.RemoveLiquidityParams[] calldata params,
        uint256 minTokenAAmount,
        uint256 minTokenBAmount,
        uint256 deadline
    ) external returns (uint256 tokenAAmount, uint256 tokenBAmount, IPool.BinDelta[] memory binDeltas);
}

library MaverickLibrary {

    function singleSwap(
        address router,
        address tokenIn,
        address tokenOut,
        address pool,
        address recipient,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) internal returns (uint256) {

        IERC20(tokenIn).approve(router, amountIn);

        IMaverickRouter.ExactInputSingleParams memory params = IMaverickRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            pool: IPool(pool),
            recipient: recipient,
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitD18: 0
        });

        return IMaverickRouter(router).exactInputSingle(params);
    }

    function multiSwap(
        address router,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        address pool0,
        address pool1,
        address recipient,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) internal returns (uint256) {

        IERC20(tokenIn).approve(router, amountIn);

        IMaverickRouter.ExactInputParams memory params = IMaverickRouter.ExactInputParams({
            path: abi.encodePacked(tokenIn, pool0, tokenMid, pool1, tokenOut),
            recipient: recipient,
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum
        });

        return IMaverickRouter(router).exactInput(params);
    }

}