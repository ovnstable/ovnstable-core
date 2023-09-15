// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

struct AddLiquidityData {
    uint256 amount0Max;
    uint256 amount1Max;
    uint256 amount0Min;
    uint256 amount1Min;
    uint256 amountSharesMin;
    address vault;
    address receiver;
    address gauge;
}

struct RemoveLiquidityData {
    uint256 burnAmount;
    uint256 amount0Min;
    uint256 amount1Min;
    address vault;
    address payable receiver;
    address gauge;
    bool receiveETH;
}

struct SwapData {
    bytes swapPayload;
    uint256 amountInSwap;
    uint256 amountOutSwap;
    address swapRouter;
    bool zeroForOne;
}

struct SwapAndAddData {
    SwapData swapData;
    AddLiquidityData addData;
}

struct UnderlyingOutput {
    uint256 amount0;
    uint256 amount1;
    uint256 fee0;
    uint256 fee1;
    uint256 leftOver0;
    uint256 leftOver1;
}

struct Range {
    int24 lowerTick;
    int24 upperTick;
    uint24 feeTier;
}

struct RangeWeight {
    Range range;
    uint256 weight; // should be between 0 and 100%
}

struct Amount {
    Range range;
    uint256 amount;
}

struct PositionLiquidity {
    uint128 liquidity;
    Range range;
}

struct SwapPayload {
    bytes payload;
    address router;
    uint256 amountIn;
    uint256 expectedMinReturn;
    bool zeroForOne;
}

struct Rebalance {
    PositionLiquidity[] burns;
    PositionLiquidity[] mints;
    SwapPayload swap;
    uint256 minBurn0;
    uint256 minBurn1;
    uint256 minDeposit0;
    uint256 minDeposit1;
}

/// @title ArrakisV2 Public Vault Router
/// @notice Smart contract for adding and removing liquidity from Public ArrakisV2 vaults
/// @author Arrakis Finance
/// @dev DO NOT ADD STATE VARIABLES - APPEND THEM TO ArrakisV2RouterStorage
interface IArrakisV2Router {

    /// @notice addLiquidity adds liquidity to ArrakisV2 vault of interest (mints LP tokens)
    /// @param params_ AddLiquidityData struct containing data for adding liquidity
    /// @return amount0 amount of token0 transferred from msg.sender to mint `mintAmount`
    /// @return amount1 amount of token1 transferred from msg.sender to mint `mintAmount`
    /// @return sharesReceived amount of ArrakisV2 tokens transferred to `receiver`
    // solhint-disable-next-line code-complexity, function-max-lines
    function addLiquidity(AddLiquidityData memory params_)
    external
    payable
    returns (
        uint256 amount0,
        uint256 amount1,
        uint256 sharesReceived
    );

    /// @notice swapAndAddLiquidity transfer tokens to and calls ArrakisV2Router
    /// @param params_ SwapAndAddData struct containing data for swap
    /// @return amount0 amount of token0 transferred from msg.sender to mint `mintAmount`
    /// @return amount1 amount of token1 transferred from msg.sender to mint `mintAmount`
    /// @return sharesReceived amount of ArrakisV2 tokens transferred to `receiver`
    /// @return amount0Diff token0 balance difference post swap
    /// @return amount1Diff token1 balance difference post swap
    // solhint-disable-next-line code-complexity, function-max-lines
    function swapAndAddLiquidity(SwapAndAddData memory params_)
    external
    payable
    returns (
        uint256 amount0,
        uint256 amount1,
        uint256 sharesReceived,
        uint256 amount0Diff,
        uint256 amount1Diff
    );

    /// @notice removeLiquidity removes liquidity from vault and burns LP tokens
    /// @param params_ RemoveLiquidityData struct containing data for withdrawals
    /// @return amount0 actual amount of token0 transferred to receiver for burning `burnAmount`
    /// @return amount1 actual amount of token1 transferred to receiver for burning `burnAmount`
    // solhint-disable-next-line code-complexity, function-max-lines
    function removeLiquidity(RemoveLiquidityData memory params_)
    external
    returns (uint256 amount0, uint256 amount1);
}

/// @title ArrakisV2 LP vault version 2
/// @notice Smart contract managing liquidity providing strategy for a given token pair
/// using multiple Uniswap V3 LP positions on multiple fee tiers.
/// @author Arrakis Finance
/// @dev DO NOT ADD STATE VARIABLES - APPEND THEM TO ArrakisV2Storage
interface IArrakisV2 is IERC20Metadata {

    struct Range {
        int24 lowerTick;
        int24 upperTick;
        uint24 feeTier;
    }

    /// @notice will send manager fees to manager
    /// @dev anyone can call this function
    function withdrawManagerBalance() external;

    function factory() external view returns (address);

    function token0() external view returns (address);

    function token1() external view returns (address);

    function init0() external view returns (uint256);

    function init1() external view returns (uint256);

    function managerFeeBPS() external view returns (uint16);

    function managerBalance0() external view returns (uint256);

    function managerBalance1() external view returns (uint256);

    function manager() external view returns (address);

    function restrictedMint() external view returns (address);

    /// @notice get full list of ranges, guaranteed to contain all active vault LP Positions.
    /// @return ranges list of ranges
    function getRanges() external view returns (Range[] memory);

    function getPools() external view returns (address[] memory);

    function getRouters() external view returns (address[] memory);
}

interface IArrakisV2Gauge is IERC20Metadata {

    function deposit(uint256 amount) external;

    function withdraw(uint256 amount) external;

    function claim_rewards() external;
}

/// @title ArrakisV2Helper helpers for querying common info about ArrakisV2 vaults
interface IArrakisV2Helper {

    /// @notice get total underlying, also returns uncollected fees and leftover separatly.
    /// @param vault_ Arrakis V2 vault to get underlying info about.
    /// @return underlying struct containing underlying amounts of
    /// token0 and token1, fees of token0 and token1, finally leftover
    /// on vault of token0 and token1.
    function totalUnderlyingWithFeesAndLeftOver(IArrakisV2 vault_)
    external
    view
    returns (UnderlyingOutput memory underlying);

    /// @notice get total underlying, also returns uncollected fees separately.
    /// @param vault_ Arrakis V2 vault to get underlying info about.
    /// @return amount0 amount of underlying of token 0 of LPs.
    /// @return amount1 amount of underlying of token 1 of LPs.
    /// @return fee0 amount of fee of token 0 of LPs.
    /// @return fee1 amount of fee of token 0 of LPs.
    function totalUnderlyingWithFees(IArrakisV2 vault_)
    external
    view
    returns (
        uint256 amount0,
        uint256 amount1,
        uint256 fee0,
        uint256 fee1
    );

    /// @notice get underlying.
    /// @param vault_ Arrakis V2 vault to get underlying info about.
    /// @return amount0 amount of underlying of token 0 of LPs.
    /// @return amount1 amount of underlying of token 1 of LPs.
    function totalUnderlying(IArrakisV2 vault_)
    external
    view
    returns (uint256 amount0, uint256 amount1);

    /// @notice get underlying at specific price.
    /// @param vault_ Arrakis V2 vault to get underlying info about.
    /// @param sqrtPriceX96_ specific price.
    /// @return amount0 amount of underlying of token 0 of LPs.
    /// @return amount1 amount of underlying of token 1 of LPs.
    function totalUnderlyingAtPrice(IArrakisV2 vault_, uint160 sqrtPriceX96_)
    external
    view
    returns (uint256 amount0, uint256 amount1);

    /// @notice get liquidity in all uniswap v3 ranges
    /// @param vault_ Arrakis V2 vault to get liquidity in ranges for
    /// @return liquidities list of ranges and amount of liquidity in each
    function totalLiquidity(IArrakisV2 vault_)
    external
    view
    returns (PositionLiquidity[] memory liquidities);

    /// @notice get underlyings of token0 and token1 in two lists.
    /// @param ranges_ list of range to get underlying info about.
    /// @param token0_ address of first token.
    /// @param token1_ address of second token.
    /// @param vaultV2_ address of Arrakis V2 vault.
    /// @return amount0s amounts of underlying of token 0 of LPs.
    /// @return amount1s amounts of underlying of token 1 of LPs.
    function token0AndToken1ByRange(
        Range[] calldata ranges_,
        address token0_,
        address token1_,
        address vaultV2_
    )
    external
    view
    returns (Amount[] memory amount0s, Amount[] memory amount1s);

    /// @notice get underlyings and fees of token0 and token1 in two lists.
    /// @param ranges_ list of range to get underlying info about.
    /// @param token0_ address of first token.
    /// @param token1_ address of second token.
    /// @param vaultV2_ address of Arrakis V2 vault.
    /// @return amount0s amounts of underlying of token 1 of LPs.
    /// @return amount1s amounts of underlying of token 1 of LPs.
    /// @return fee0s amounts of fees of token 0 of LPs.
    /// @return fee1s amounts of fees of token 1 of LPs.
    function token0AndToken1PlusFeesByRange(
        Range[] calldata ranges_,
        address token0_,
        address token1_,
        address vaultV2_
    )
    external
    view
    returns (
        Amount[] memory amount0s,
        Amount[] memory amount1s,
        Amount[] memory fee0s,
        Amount[] memory fee1s
    );
}

/// @title ArrakisV2Resolver helpers that resolve / compute payloads for ArrakisV2 calls
interface IArrakisV2Resolver {

    /// @notice Standard rebalance (without swapping)
    /// @param rangeWeights_ list of ranges by weights.
    /// @param vaultV2_ Arrakis V2 vault.
    /// @return rebalanceParams payload to send to rebalance
    /// function on Arrakis V2 contract.
    // solhint-disable-next-line function-max-lines, code-complexity
    function standardRebalance(
        RangeWeight[] memory rangeWeights_,
        IArrakisV2 vaultV2_
    ) external view returns (Rebalance memory rebalanceParams);

    /// @notice Mint Amount.
    /// @param vaultV2_ Arrakis V2 vault.
    /// @param amount0Max_ max amount of token 0.
    /// @param amount1Max_ max amount of token 1.
    /// @return amount0 of token 0 expected to be deposited.
    /// @return amount1 of token 1 expected to be deposited.
    /// @return mintAmount amount f shares expected to be minted.
    // solhint-disable-next-line function-max-lines
    function getMintAmounts(
        IArrakisV2 vaultV2_,
        uint256 amount0Max_,
        uint256 amount1Max_
    )
    external
    view
    returns (
        uint256 amount0,
        uint256 amount1,
        uint256 mintAmount
    );

    /// @notice Exposes Uniswap's getAmountsForLiquidity helper function,
    /// returns amount0 and amount1 for a given amount of liquidity.
    function getAmountsForLiquidity(
        uint160 sqrtPriceX96_,
        int24 lowerTick_,
        int24 upperTick_,
        int128 liquidity_
    ) external pure returns (uint256 amount0, uint256 amount1);

    /// @notice Expose getPositionId helper function for uniswap positionIds
    /// returns bytes32 positionId
    function getPositionId(
        address addr_,
        int24 lowerTick_,
        int24 upperTick_
    ) external pure returns (bytes32 positionId);
}