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
    SWAP,
    STAKE,
    CONVERT,
    VOTE,
    USER
}

enum AmountType {
    EXACTLY,
    AT_MOST,
    ALL
}

interface IVault {
    function notifyInitialSupply(Token, uint128, uint128) external;
    function attachBribe(IGauge gauge, IBribe bribe) external;
    function killBribe(IGauge gauge, IBribe bribe) external;
    function killGauge(IGauge gauge, bool t) external;
    function ballotToken() external returns (Token);
    function emissionToken() external returns (Token);
    function execute(Token[] calldata tokenRef, int128[] memory deposit, VelocoreOperation[] calldata ops)
    external
    payable;

    function query(address user, Token[] calldata tokenRef, int128[] memory deposit, VelocoreOperation[] calldata ops)
    external
    returns (int128[] memory);

    function inspect(address lens, bytes memory data) external;
}

interface IPool {
    function poolParams() external view returns (bytes memory);
}

/**
 * Gauges are just pools.
 * instead of velocore__execute, they interact with velocore__gauge.
 * (un)staking is done by putting/extracting staking token (usually LP token) from/into the pool with velocore__gauge.
 * harvesting is done by setting the staking amount to zero.
 */
interface IGauge is IPool {
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

interface IBribe is IPool {
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
    function velocore__bribe(IGauge gauge, uint256 elapsed)
    external
    returns (
        Token[] memory bribeTokens,
        int128[] memory deltaGauge,
        int128[] memory deltaPool,
        int128[] memory deltaExternal
    );

    function bribeTokens(IGauge gauge) external view returns (Token[] memory);
    function bribeRates(IGauge gauge) external view returns (uint256[] memory);
}

library VelocoreV2Library {

    function toToken(IERC20 tok) internal pure returns (Token) {
        return Token.wrap(bytes32(uint256(uint160(address(tok)))));
    }

    function run2(
        address vault,
        uint256 value,
        address pool,
        OperationType operationType,
        IERC20 token0,
        AmountType amountType0,
        uint256 amount0,
        IERC20 token1,
        AmountType amountType1,
        uint256 amount1
    ) internal {

        token0.approve(vault, amount0);

        Token[] memory tokens = new Token[](2);
        tokens[0] = toToken(token0);
        tokens[1] = toToken(token1);

        VelocoreOperation[] memory ops = new VelocoreOperation[](1);
        ops[0].poolId = bytes32(bytes1(uint8(operationType))) | bytes32(uint256(uint160(pool)));
        ops[0].tokenInformations = new bytes32[](2);
        ops[0].data = "";

        ops[0].tokenInformations[0] = bytes32(bytes1(0x00)) | bytes32(bytes2(uint16(amountType0))) | bytes32(amount0);
        ops[0].tokenInformations[1] = bytes32(bytes1(0x01)) | bytes32(bytes2(uint16(amountType1))) | bytes32(amount1);

        IVault(vault).execute{value: value}(tokens, new int128[](2), ops);
    }

    function run3(
        address vault,
        uint256 value,
        address pool,
        OperationType operationType,
        IERC20 token0,
        AmountType amountType0,
        uint256 amount0,
        IERC20 token1,
        AmountType amountType1,
        uint256 amount1,
        IERC20 token2,
        AmountType amountType2,
        uint256 amount2
    ) internal {

        token0.approve(vault, amount0);

        Token[] memory tokens = new Token[](3);
        tokens[0] = toToken(token0);
        tokens[1] = toToken(token1);
        tokens[2] = toToken(token2);

        VelocoreOperation[] memory ops = new VelocoreOperation[](1);
        ops[0].poolId = bytes32(bytes1(uint8(operationType))) | bytes32(uint256(uint160(pool)));
        ops[0].tokenInformations = new bytes32[](3);
        ops[0].data = "";

        ops[0].tokenInformations[0] = bytes32(bytes1(0x00)) | bytes32(bytes2(uint16(amountType0))) | bytes32(amount0);
        ops[0].tokenInformations[1] = bytes32(bytes1(0x01)) | bytes32(bytes2(uint16(amountType1))) | bytes32(amount1);
        ops[0].tokenInformations[2] = bytes32(bytes1(0x02)) | bytes32(bytes2(uint16(amountType2))) | bytes32(amount2);

        IVault(vault).execute{value: value}(tokens, new int128[](3), ops);
    }
}