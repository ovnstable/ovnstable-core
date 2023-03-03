// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ITridentRouter {

    struct Path {
        address pool;
        bytes data;
    }

    struct ExactInputSingleParams {
        uint256 amountIn;
        uint256 amountOutMinimum;
        address pool;
        address tokenIn;
        bytes data;
    }

    struct ExactInputParams {
        address tokenIn;
        uint256 amountIn;
        uint256 amountOutMinimum;
        Path[] path;
    }

    struct TokenInput {
        address token;
        bool native;
        uint256 amount;
    }

    struct InitialPath {
        address tokenIn;
        address pool;
        bool native;
        uint256 amount;
        bytes data;
    }

    struct PercentagePath {
        address tokenIn;
        address pool;
        uint64 balancePercentage; // Multiplied by 10^6. 100% = 100_000_000
        bytes data;
    }

    struct Output {
        address token;
        address to;
        bool unwrapBento;
        uint256 minAmount;
    }

    struct ComplexPathParams {
        InitialPath[] initialPath;
        PercentagePath[] percentagePath;
        Output[] output;
    }

    /// @dev This struct frames output tokens for burns.
    struct TokenAmount {
        address token;
        uint256 amount;
    }

    /// @notice Swaps token A to token B directly. Swaps are done on `bento` tokens.
    /// @param params This includes the address of token A, pool, amount of token A to swap,
    /// minimum amount of token B after the swap and data required by the pool for the swap.
    /// @dev Ensure that the pool is trusted before calling this function. The pool can steal users' tokens.
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);

    /// @notice Swaps token A to token B indirectly by using multiple hops.
    /// @param params This includes the addresses of the tokens, pools, amount of token A to swap,
    /// minimum amount of token B after the swap and data required by the pools for the swaps.
    /// @dev Ensure that the pools are trusted before calling this function. The pools can steal users' tokens.
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);

    /// @notice Swaps token A to token B directly. It's the same as `exactInputSingle` except
    /// it takes raw ERC-20 tokens from the users and deposits them into `bento`.
    /// @param params This includes the address of token A, pool, amount of token A to swap,
    /// minimum amount of token B after the swap and data required by the pool for the swap.
    /// @dev Ensure that the pool is trusted before calling this function. The pool can steal users' tokens.
    function exactInputSingleWithNativeToken(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);

    /// @notice Swaps token A to token B indirectly by using multiple hops. It's the same as `exactInput` except
    /// it takes raw ERC-20 tokens from the users and deposits them into `bento`.
    /// @param params This includes the addresses of the tokens, pools, amount of token A to swap,
    /// minimum amount of token B after the swap and data required by the pools for the swaps.
    /// @dev Ensure that the pools are trusted before calling this function. The pools can steal users' tokens.
    function exactInputWithNativeToken(ExactInputParams calldata params) external payable returns (uint256 amountOut);

    /// @notice Swaps multiple input tokens to multiple output tokens using multiple paths, in different percentages.
    /// For example, you can swap 50 DAI + 100 USDC into 60% ETH and 40% BTC.
    /// @param params This includes everything needed for the swap. Look at the `ComplexPathParams` struct for more details.
    /// @dev This function is not optimized for single swaps and should only be used in complex cases where
    /// the amounts are large enough that minimizing slippage by using multiple paths is worth the extra gas.
    function complexPath(ComplexPathParams calldata params) external payable;

    /// @notice Add liquidity to a pool.
    /// @param tokenInput Token address and amount to add as liquidity.
    /// @param pool Pool address to add liquidity to.
    /// @param minLiquidity Minimum output liquidity - caps slippage.
    /// @param data Data required by the pool to add liquidity.
    function addLiquidity(
        TokenInput[] calldata tokenInput,
        address pool,
        uint256 minLiquidity,
        bytes calldata data
    ) external payable returns (uint256 liquidity);

    /// @notice Burn liquidity tokens to get back `bento` tokens.
    /// @param pool Pool address.
    /// @param liquidity Amount of liquidity tokens to burn.
    /// @param data Data required by the pool to burn liquidity.
    /// @param minWithdrawals Minimum amount of `bento` tokens to be returned.
    function burnLiquidity(
        address pool,
        uint256 liquidity,
        bytes calldata data,
        TokenAmount[] calldata minWithdrawals
    ) external payable;

    /// @notice Burn liquidity tokens to get back `bento` tokens.
    /// @dev The tokens are swapped automatically and the output is in a single token.
    /// @param pool Pool address.
    /// @param liquidity Amount of liquidity tokens to burn.
    /// @param data Data required by the pool to burn liquidity.
    /// @param minWithdrawal Minimum amount of tokens to be returned.
    function burnLiquiditySingle(
        address pool,
        uint256 liquidity,
        bytes calldata data,
        uint256 minWithdrawal
    ) external payable;

    function approveMasterContract(
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external payable;
}

/// @notice The (older) MasterChef contract gives out a constant number of SUSHI tokens per block.
/// It is the only address with minting rights for SUSHI.
/// The idea for this MasterChef V2 (MCV2) contract is therefore to be the owner of a dummy token
/// that is deposited into the MasterChef V1 (MCV1) contract.
/// The allocation point for this pool on MCV1 is the total allocation point for all pools that receive double incentives.
interface IMiniChefV2 {

    /// @notice Info of each MCV2 user.
    /// `amount` LP token amount the user has provided.
    /// `rewardDebt` The amount of SUSHI entitled to the user.
    /// @notice Info of each user that stakes LP tokens.
    function userInfo(uint256 _pid, address _user) external view returns (uint256, uint256);

    /// @notice Deposit LP tokens to MCV2 for SUSHI allocation.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param amount LP token amount to deposit.
    /// @param to The receiver of `amount` deposit benefit.
    function deposit(uint256 pid, uint256 amount, address to) external;

    /// @notice Withdraw LP tokens from MCV2.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param amount LP token amount to withdraw.
    /// @param to Receiver of the LP tokens.
    function withdraw(uint256 pid, uint256 amount, address to) external;

    /// @notice Harvest proceeds for transaction sender to `to`.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param to Receiver of SUSHI rewards.
    function harvest(uint256 pid, address to) external;

    /// @notice Withdraw LP tokens from MCV2 and harvest proceeds for transaction sender to `to`.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param amount LP token amount to withdraw.
    /// @param to Receiver of the LP tokens and SUSHI rewards.
    function withdrawAndHarvest(uint256 pid, uint256 amount, address to) external;

    /// @notice Withdraw without caring about rewards. EMERGENCY ONLY.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param to Receiver of the LP tokens.
    function emergencyWithdraw(uint256 pid, address to) external;
}

interface IStablePool is IERC20 {

    function token0() external view returns (address);

    function token1() external view returns (address);

    function getAmountOut(bytes calldata data) external view returns (uint256 finalAmountOut);

    function getAssets() external view returns (address[] memory assets);

    function skim() external;

    function getReserves() external view returns (uint256 _reserve0, uint256 _reserve1);

    function getNativeReserves() external view returns (uint256 _nativeReserve0, uint256 _nativeReserve1);

}

interface IFlashBorrower {
    /// @notice The flashloan callback. `amount` + `fee` needs to repayed to msg.sender before this call returns.
    /// @param sender The address of the invoker of this flashloan.
    /// @param token The address of the token that is loaned.
    /// @param amount of the `token` that is loaned.
    /// @param fee The fee that needs to be paid on top for this loan. Needs to be the same as `token`.
    /// @param data Additional data that was passed to the flashloan function.
    function onFlashLoan(
        address sender,
        IERC20 token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external;
}

interface IBatchFlashBorrower {
    /// @notice The callback for batched flashloans. Every amount + fee needs to repayed to msg.sender before this call returns.
    /// @param sender The address of the invoker of this flashloan.
    /// @param tokens Array of addresses for ERC-20 tokens that is loaned.
    /// @param amounts A one-to-one map to `tokens` that is loaned.
    /// @param fees A one-to-one map to `tokens` that needs to be paid on top for each loan. Needs to be the same token.
    /// @param data Additional data that was passed to the flashloan function.
    function onBatchFlashLoan(
        address sender,
        IERC20[] calldata tokens,
        uint256[] calldata amounts,
        uint256[] calldata fees,
        bytes calldata data
    ) external;
}

/// @title BentoBox
/// @author BoringCrypto, Keno
/// @notice The BentoBox is a vault for tokens. The stored tokens can be flash loaned and used in strategies.
/// Yield from this will go to the token depositors.
/// Rebasing tokens ARE NOT supported and WILL cause loss of funds.
/// Any funds transfered directly onto the BentoBox will be lost, use the deposit function instead.
interface IBentoBox {

    struct Rebase {
        uint128 elastic;
        uint128 base;
    }

    struct StrategyData {
        uint64 strategyStartDate;
        uint64 targetPercentage;
        uint128 balance; // the balance of the strategy that BentoBox thinks is in there
    }

    function totals(IERC20 token) external view returns (Rebase memory rebase);

    function strategyData(IERC20 token) external view returns (StrategyData memory rebase);

    // Balance per token per address/contract in shares
    function balanceOf(
        IERC20 token,
        address from
    ) external view returns (uint256 amount);

    /// @dev Helper function to represent an `amount` of `token` in shares.
    /// @param token The ERC-20 token.
    /// @param amount The `token` amount.
    /// @param roundUp If the result `share` should be rounded up.
    /// @return share The token amount represented in shares.
    function toShare(
        IERC20 token,
        uint256 amount,
        bool roundUp
    ) external view returns (uint256 share);

    /// @dev Helper function represent shares back into the `token` amount.
    /// @param token The ERC-20 token.
    /// @param share The amount of shares.
    /// @param roundUp If the result should be rounded up.
    /// @return amount The share amount back into native representation.
    function toAmount(
        IERC20 token,
        uint256 share,
        bool roundUp
    ) external view returns (uint256 amount);

    /// @notice Deposit an amount of `token` represented in either `amount` or `share`.
    /// @param token_ The ERC-20 token to deposit.
    /// @param from which account to pull the tokens.
    /// @param to which account to push the tokens.
    /// @param amount Token amount in native representation to deposit.
    /// @param share Token amount represented in shares to deposit. Takes precedence over `amount`.
    /// @return amountOut The amount deposited.
    /// @return shareOut The deposited amount repesented in shares.
    function deposit(
        IERC20 token_,
        address from,
        address to,
        uint256 amount,
        uint256 share
    ) external payable returns (uint256 amountOut, uint256 shareOut);

    /// @notice Withdraws an amount of `token` from a user account.
    /// @param token_ The ERC-20 token to withdraw.
    /// @param from which user to pull the tokens.
    /// @param to which user to push the tokens.
    /// @param amount of tokens. Either one of `amount` or `share` needs to be supplied.
    /// @param share Like above, but `share` takes precedence over `amount`.
    function withdraw(
        IERC20 token_,
        address from,
        address to,
        uint256 amount,
        uint256 share
    ) external returns (uint256 amountOut, uint256 shareOut);

    /// @notice Transfer shares from a user account to another one.
    /// @param token The ERC-20 token to transfer.
    /// @param from which user to pull the tokens.
    /// @param to which user to push the tokens.
    /// @param share The amount of `token` in shares.
    // Clones of master contracts can transfer from any account that has approved them
    // F3 - Can it be combined with another similar function?
    // F3: This isn't combined with transferMultiple for gas optimization
    function transfer(
        IERC20 token,
        address from,
        address to,
        uint256 share
    ) external;

    /// @notice Transfer shares from a user account to multiple other ones.
    /// @param token The ERC-20 token to transfer.
    /// @param from which user to pull the tokens.
    /// @param tos The receivers of the tokens.
    /// @param shares The amount of `token` in shares for each receiver in `tos`.
    // F3 - Can it be combined with another similar function?
    // F3: This isn't combined with transfer for gas optimization
    function transferMultiple(
        IERC20 token,
        address from,
        address[] calldata tos,
        uint256[] calldata shares
    ) external;

    /// @notice Flashloan ability.
    /// @param borrower The address of the contract that implements and conforms to `IFlashBorrower` and handles the flashloan.
    /// @param receiver Address of the token receiver.
    /// @param token The address of the token to receive.
    /// @param amount of the tokens to receive.
    /// @param data The calldata to pass to the `borrower` contract.
    // F5 - Checks-Effects-Interactions pattern followed? (SWC-107)
    // F5: Not possible to follow this here, reentrancy has been reviewed
    // F6 - Check for front-running possibilities, such as the approve function (SWC-114)
    // F6: Slight grieving possible by withdrawing an amount before someone tries to flashloan close to the full amount.
    function flashLoan(
        IFlashBorrower borrower,
        address receiver,
        IERC20 token,
        uint256 amount,
        bytes calldata data
    ) external;

    /// @notice Support for batched flashloans. Useful to request multiple different `tokens` in a single transaction.
    /// @param borrower The address of the contract that implements and conforms to `IBatchFlashBorrower` and handles the flashloan.
    /// @param receivers An array of the token receivers. A one-to-one mapping with `tokens` and `amounts`.
    /// @param tokens The addresses of the tokens.
    /// @param amounts of the tokens for each receiver.
    /// @param data The calldata to pass to the `borrower` contract.
    // F5 - Checks-Effects-Interactions pattern followed? (SWC-107)
    // F5: Not possible to follow this here, reentrancy has been reviewed
    // F6 - Check for front-running possibilities, such as the approve function (SWC-114)
    // F6: Slight grieving possible by withdrawing an amount before someone tries to flashloan close to the full amount.
    function batchFlashLoan(
        IBatchFlashBorrower borrower,
        address[] calldata receivers,
        IERC20[] calldata tokens,
        uint256[] calldata amounts,
        bytes calldata data
    ) external;

    /// @notice The actual process of yield farming. Executes the strategy of `token`.
    /// Optionally does housekeeping if `balance` is true.
    /// `maxChangeAmount` is relevant for skimming or withdrawing if `balance` is true.
    /// @param token The address of the token for which a strategy is deployed.
    /// @param balance True if housekeeping should be done.
    /// @param maxChangeAmount The maximum amount for either pulling or pushing from/to the `IStrategy` contract.
    // F5 - Checks-Effects-Interactions pattern followed? (SWC-107)
    // F5: Total amount is updated AFTER interaction. But strategy is under our control.
    // F5: Not followed to prevent reentrancy issues with flashloans and BentoBox skims?
    function harvest(
        IERC20 token,
        bool balance,
        uint256 maxChangeAmount
    ) external;

    /// @notice Approves or revokes a `masterContract` access to `user` funds.
    /// @param user The address of the user that approves or revokes access.
    /// @param masterContract The address who gains or loses access.
    /// @param approved If True approves access. If False revokes access.
    /// @param v Part of the signature. (See EIP-191)
    /// @param r Part of the signature. (See EIP-191)
    /// @param s Part of the signature. (See EIP-191)
    // F4 - Check behaviour for all function arguments when wrong or extreme
    // F4: Don't allow masterContract 0 to be approved. Unknown contracts will have a masterContract of 0.
    // F4: User can't be 0 for signed approvals because the recoveredAddress will be 0 if ecrecover fails
    function setMasterContractApproval(
        address user,
        address masterContract,
        bool approved,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}
