// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

type Token is bytes32;

struct VelocoreOperation {
    bytes32 poolId;
    bytes32[] tokenInformations;
    bytes data;
}

enum OperationType {
    SWAP, // add/remove/swap
    GAUGE, // stake/unstake/claim rewards
    CONVERT,
    VOTE,
    USER
}

enum AmountType {
    EXACTLY, // exact amount
    AT_MOST, // min amount
    ALL
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint wad) external;
}

interface IVault {
    struct Facet {
        address facetAddress;
        bytes4[] functionSelectors;
    }

    function notifyInitialSupply(Token, uint128, uint128) external;
    function attachBribe(IGauge gauge, IBribe bribe) external;
    function killBribe(IGauge gauge, IBribe bribe) external;
    function killGauge(IGauge gauge, bool t) external;
    function ballotToken() external returns (Token);
    function emissionToken() external returns (Token);
    function execute(Token[] calldata tokenRef, int128[] memory deposit, VelocoreOperation[] calldata ops)
    external
    payable;

    function facets() external view returns (Facet[] memory facets_);
    function facetFunctionSelectors(address _facet) external view returns (bytes4[] memory facetFunctionSelectors_);
    function facetAddresses() external view returns (address[] memory facetAddresses_);
    function facetAddress(bytes4 _functionSelector) external view returns (address facetAddress_);

    function query(address user, Token[] calldata tokenRef, int128[] memory deposit, VelocoreOperation[] calldata ops)
    external
    returns (int128[] memory);


    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
    function swapExactETHForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline)
    external
    payable
    returns (uint256[] memory amounts);
    function swapTokensForExactETH(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
    function swapETHForExactTokens(uint256 amountOut, address[] calldata path, address to, uint256 deadline)
    external
    payable
    returns (uint256[] memory amounts);

    function getAmountsOut(uint256 amountIn, address[] calldata path) external returns (uint256[] memory amounts);
    function getAmountsIn(uint256 amountOut, address[] calldata path) external returns (uint256[] memory amounts);

    function execute1(address pool, uint8 method, address t1, uint8 m1, int128 a1, bytes memory data)
    external
    payable
    returns (int128[] memory);

    function query1(address pool, uint8 method, address t1, uint8 m1, int128 a1, bytes memory data)
    external
    returns (int128[] memory);

    function execute2(
        address pool,
        uint8 method,
        address t1,
        uint8 m1,
        int128 a1,
        address t2,
        uint8 m2,
        int128 a2,
        bytes memory data
    ) external payable returns (int128[] memory);

    function query2(
        address pool,
        uint8 method,
        address t1,
        uint8 m1,
        int128 a1,
        address t2,
        uint8 m2,
        int128 a2,
        bytes memory data
    ) external returns (int128[] memory);

    function execute3(
        address pool,
        uint8 method,
        address t1,
        uint8 m1,
        int128 a1,
        address t2,
        uint8 m2,
        int128 a2,
        address t3,
        uint8 m3,
        int128 a3,
        bytes memory data
    ) external payable returns (int128[] memory);

    function query3(
        address pool,
        uint8 method,
        address t1,
        uint8 m1,
        int128 a1,
        address t2,
        uint8 m2,
        int128 a2,
        address t3,
        uint8 m3,
        int128 a3,
        bytes memory data
    ) external returns (int128[] memory);


    function getPair(address t0, address t1) external view returns (address);

    function allPairs(uint256 i) external view returns (address);

    function allPairsLength() external view returns (uint256);
}

interface ISwap {
    function velocore__execute(address user, Token[] calldata tokens, int128[] memory amounts, bytes calldata data)
    external
    returns (int128[] memory, int128[] memory);
    function swapType() external view returns (string memory);
    function listedTokens() external view returns (Token[] memory);
    function lpTokens() external view returns (Token[] memory);
    function underlyingTokens(Token lp) external view returns (Token[] memory);
}

/**
 * Gauges are just pools.
 * instead of velocore__execute, they interact with velocore__gauge.
 * (un)staking is done by putting/extracting staking token (usually LP token) from/into the pool with velocore__gauge.
 * harvesting is done by setting the staking amount to zero.
 */
interface IGauge {
    /**
     * @dev This method is called by Vault.execute().
     * the parameters and return values are the same as velocore__execute.
     * The only difference is that the vault will call velocore__emission before calling velocore__gauge.
     */
    function velocore__gauge(address user, Token[] calldata tokens, int128[] memory amounts, bytes calldata data)
    external
    returns (int128[] memory deltaGauge, int128[] memory deltaPool);

    /**
     * @dev This method is called by Vault.execute() before calling velocore__emission or changing votes.
     *
     * The vault will credit emitted VC into the gauge balance.
     * IGauge is expected to update its internal ledger.
     * @param newEmissions newly emitted VCs since last emission
     */
    function velocore__emission(uint256 newEmissions) external;

    function stakeableTokens() external view returns (Token[] memory);
    function stakedTokens(address user) external view returns (uint256[] memory);
    function stakedTokens() external view returns (uint256[] memory);
    function emissionShare(address user) external view returns (uint256);
    function naturalBribes() external view returns (Token[] memory);
}

interface IBribe {
    /**
     * @dev This method is called when someone vote/harvest from/to a @param gauge,
     * and when this IBribe happens to be attached to the gauge.
     *
     * Attachment can happen without IBribe's permission. Implementations must verify that @param gauge is correct.
     *
     * Returns balance deltas; their net differences are credited as bribe.
     * deltaExternal must be zero or negative; Vault will take specified amounts from the contract's balance
     *
     * @param  gauge  the gauge to bribe for.
     * @param  elapsed  elapsed time after last call; can be used to save gas.
     */
    function velocore__bribe(address gauge, uint256 elapsed)
    external
    returns (
        Token[] memory bribeTokens,
        int128[] memory deltaGauge,
        int128[] memory deltaPool,
        int128[] memory deltaExternal
    );

    function bribeTokens(address gauge) external view returns (Token[] memory);
    function bribeRates(address gauge) external view returns (uint256[] memory);
    function totalBribes(address gauge) external view returns (uint256);
}

interface IPool is ISwap, IGauge, IBribe, IERC20Metadata {
    function poolBalances() external view returns (uint256[] memory);
    function poolParams() external view returns (bytes memory);
}

interface IRebaseWrapper is IERC20Metadata {
    function skim() external;

    function depositExactOut(uint256 amountOut) external;

    function depositExactIn(uint256 amountIn) external;

    function withdrawExactOut(uint256 amountOut) external;

    function withdrawExactIn(uint256 amountIn) external;
}

interface ILinearBribeFactory {

    function bribes(Token tok) external view returns (address bribe);

    function listedTokens() external view returns (Token[] memory);

    function swapType() external view returns (string memory);

    function lpTokens() external view returns (Token[] memory ret);

    function underlyingTokens(Token tok) external view returns (Token[] memory);
}

library VelocoreV2Library {

    bytes32 constant TOKEN_MASK = 0x000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;

    function toToken(address token) internal pure returns (Token) {
        return Token.wrap(bytes32(uint256(uint160(token))));
    }

    function toAddress(Token token) internal pure returns (address) {
        return address(uint160(uint256(Token.unwrap(token) & TOKEN_MASK)));
    }

    function run1(
        address vault,
        uint256 value,
        address pool,
        OperationType operationType,
        address token0,
        AmountType amountType0,
        uint256 amount0,
        bytes memory data
    ) internal returns (uint256) {

        if (token0 != address(0)) {
            IERC20(token0).approve(vault, amount0);
        }

        int128[] memory amountOut = IVault(vault).execute1{value: value}(
            pool,
            uint8(operationType),
            token0,
            uint8(amountType0),
            int128(uint128(amount0)),
            data
        );

        return uint256(uint128(-amountOut[0]));
    }

    function run2(
        address vault,
        uint256 value,
        address pool,
        OperationType operationType,
        address token0,
        AmountType amountType0,
        uint256 amount0,
        address token1,
        AmountType amountType1,
        uint256 amount1
    ) internal returns (uint256) {

        if (token0 != address(0)) {
            IERC20(token0).approve(vault, amount0);
        }

        int128[] memory amountOut = IVault(vault).execute2{value: value}(
            pool,
            uint8(operationType),
            token0,
            uint8(amountType0),
            int128(uint128(amount0)),
            token1,
            uint8(amountType1),
            int128(uint128(amount1)),
            ""
        );

        return uint256(uint128(amountOut[1]));
    }

    function run3(
        address vault,
        uint256 value,
        address pool,
        OperationType operationType,
        address token0,
        AmountType amountType0,
        uint256 amount0,
        address token1,
        AmountType amountType1,
        uint256 amount1,
        address token2,
        AmountType amountType2,
        uint256 amount2
    ) internal returns (uint256) {

        if (token0 != address(0)) {
            IERC20(token0).approve(vault, amount0);
        }
        if (token1 != address(0)) {
            IERC20(token1).approve(vault, amount1);
        }

        int128[] memory amountOut = IVault(vault).execute3{value: value}(
            pool,
            uint8(operationType),
            token0,
            uint8(amountType0),
            int128(uint128(amount0)),
            token1,
            uint8(amountType1),
            int128(uint128(amount1)),
            token2,
            uint8(amountType2),
            int128(uint128(amount2)),
            ""
        );

        return uint256(uint128(amountOut[2]));
    }
}