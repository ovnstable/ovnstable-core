// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

interface INFTHandler is IERC721Receiver {
    function onNFTHarvest(
        address operator,
        address to,
        uint256 tokenId,
        uint256 arxAmount,
        uint256 xArxAmount,
        uint256 wethAmount
    ) external returns (bool);

    function onNFTAddToPosition(address operator, uint256 tokenId, uint256 lpAmount) external returns (bool);

    function onNFTWithdraw(address operator, uint256 tokenId, uint256 lpAmount) external returns (bool);
}


interface INFTPool is IERC721 {
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
    function exists(uint256 tokenId) external view returns (bool);
    function hasDeposits() external view returns (bool);
    function lastTokenId() external view returns (uint256);
    function getPoolInfo() external view returns (
        address lpToken, address grailToken, address sbtToken, uint256 lastRewardTime, uint256 accRewardsPerShare,
        uint256 lpSupply, uint256 lpSupplyWithMultiplier, uint256 allocPoint
    );
    function getStakingPosition(uint256 tokenId) external view returns (
        uint256 amount, uint256 amountWithMultiplier, uint256 startLockTime,
        uint256 lockDuration, uint256 lockMultiplier, uint256 rewardDebt,
        uint256 boostPoints, uint256 totalMultiplier
    );
    function createPosition(uint256 amount, uint256 lockDuration) external;
    function boost(uint256 userAddress, uint256 amount) external;
    function unboost(uint256 userAddress, uint256 amount) external;

    function addToPosition(uint256 tokenId, uint256 amountToAdd) external;

    function withdrawFromPosition(uint256 tokenId, uint256 amountToWithdraw) external;

    function harvestPosition(uint256 tokenId) external;
}


interface IBaseSwapRouter01 {
    function factory() external pure returns (address);

    function WETH() external pure returns (address);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);

    function removeLiquidityETH(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountToken, uint256 amountETH);

    function removeLiquidityWithPermit(
        address tokenA,
        address tokenB,
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

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

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

    function swapETHForExactTokens(
        uint256 amountOut,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) external pure returns (uint256 amountB);

    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) external pure returns (uint256 amountOut);

    function getAmountIn(
        uint256 amountOut,
        uint256 reserveIn,
        uint256 reserveOut
    ) external pure returns (uint256 amountIn);

    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);

    function getAmountsIn(uint256 amountOut, address[] calldata path) external view returns (uint256[] memory amounts);
}

interface IBaseSwapRouter02 is IBaseSwapRouter01 {
    function removeLiquidityETHSupportingFeeOnTransferTokens(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountETH);

    function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 amountETH);

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;

    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable;

    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external;
}

interface IBaseSwapPair {
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);

    function name() external pure returns (string memory);

    function symbol() external pure returns (string memory);

    function decimals() external pure returns (uint8);

    function totalSupply() external view returns (uint256);

    function balanceOf(address owner) external view returns (uint256);

    function allowance(address owner, address spender) external view returns (uint256);

    function approve(address spender, uint256 value) external returns (bool);

    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(address from, address to, uint256 value) external returns (bool);

    function DOMAIN_SEPARATOR() external view returns (bytes32);

    function PERMIT_TYPEHASH() external pure returns (bytes32);

    function nonces(address owner) external view returns (uint256);

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    function MINIMUM_LIQUIDITY() external pure returns (uint256);

    function factory() external view returns (address);

    function token0() external view returns (address);

    function token1() external view returns (address);

    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);

    function price0CumulativeLast() external view returns (uint256);

    function price1CumulativeLast() external view returns (uint256);

    function kLast() external view returns (uint256);

    function mint(address to) external returns (uint256 liquidity);

    function burn(address to) external returns (uint256 amount0, uint256 amount1);

    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external;

    function skim(address to) external;

    function sync() external;

    function initialize(address, address) external;
}

interface IMasterChefV2 {

    // Info of each user that stakes LP tokens.
    function userInfo(uint256 pid, address user) external view returns (uint256 amount, uint256 rewardDebt);

    // Info of each pool.
    struct PoolInfo {
        address lpToken;           // Address of LP token contract.
        uint256 allocPoint;
        uint256 lastRewardTime;
        uint256 accPerShare;
        uint256 totalDeposit;
    }

    function poolLength() external view returns (uint256);

    function poolInfo(uint256 _pid) external view returns (PoolInfo memory poolInfo);

    // Allows users to see if rewards have started
    function rewardsStarted() external view returns (bool);

    // Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to) external view returns (uint256);

    // View function to see pending BSWAP on frontend.
    function pendingReward(uint256 _pid, address _user) external view returns (uint256);

    // Update reward variables for all pools. Be careful of gas spending!
    function massUpdatePools() external;

    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) external;

    // Deposit LP tokens to MasterChef for BSWAP allocation.
    function deposit(uint256 _pid, uint256 _amount) external;

    // Withdraw LP tokens from MasterChef.
    function withdraw(uint256 _pid, uint256 _amount) external;

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _pid) external;

}

/*
 * xBSX is Baseswaps's escrowed governance token obtainable by converting token to it
 * It's non-transferable, except from/to whitelisted addresses
 * It can be converted back to token through a vesting process
 * This contract is made to receive xToken deposits from users in order to allocate them to Usages (plugins) contracts
 */
interface IXBSX is IERC20Metadata {

    struct RedeemInfo {
        uint256 amount; // token amount to receive when vesting has ended
        uint256 xTokenAmount; // xToken amount to redeem
        uint256 endTime;
        address dividendsAddress;
        uint256 dividendsAllocation; // Share of redeeming xToken to allocate to the Dividends Usage contract
    }

    function minRedeemRatio() external view returns (uint256);

    function maxRedeemRatio() external view returns (uint256);

    function minRedeemDuration() external view returns (uint256);

    function maxRedeemDuration() external view returns (uint256);

    /*
     * @dev Returns user's xToken balances
     */
    function getxTokenBalance(address userAddress) external view returns (uint256 allocatedAmount, uint256 redeemingAmount);

    /*
     * @dev returns redeemable token for "amount" of xToken vested for "duration" seconds
     */
    function getAmountByVestingDuration(uint256 amount, uint256 duration) external view returns (uint256);

    /**
     * @dev returns quantity of "userAddress" pending redeems
     */
    function getUserRedeemsLength(address userAddress) external view returns (uint256);

    /**
     * @dev returns "userAddress" info for a pending redeem identified by "redeemIndex"
     */
    function getUserRedeem(
        address userAddress,
        uint256 redeemIndex
    )
    external
    view
    returns (RedeemInfo memory);

    /**
     * @dev returns approved xToken to allocate from "userAddress" to "usageAddress"
     */
    function getUsageApproval(address userAddress, address usageAddress) external view returns (uint256);

    /**
     * @dev returns allocated xToken from "userAddress" to "usageAddress"
     */
    function getUsageAllocation(address userAddress, address usageAddress) external view returns (uint256);

    /**
     * @dev returns length of transferWhitelist array
     */
    function transferWhitelistLength() external view returns (uint256);

    /**
     * @dev returns transferWhitelist array item's address for "index"
     */
    function transferWhitelist(uint256 index) external view returns (address);

    /**
     * @dev returns if "account" is allowed to send/receive xToken
     */
    function isTransferWhitelisted(address account) external view returns (bool);

    /**
     * @dev Approves "usage" address to get allocations up to "amount" of xToken from msg.sender
     * IXTokenUsageenUsage is the systems plugin interface.
     */
    function approveUsage(address usage, uint256 amount) external;

    /**
     * @dev Convert caller's "amount" of token to xToken
     */
    function convert(uint256 amount) external;

    /**
     * @dev Convert caller's "amount" of token to xToken to "to" address
     */
    function convertTo(uint256 amount, address to) external;

    /**
     * @dev Initiates redeem process (xToken to token)
     *
     * Handles dividends' compensation allocation during the vesting process if needed
     */
    function redeem(uint256 xTokenAmount, uint256 duration) external;

    /**
     * @dev Finalizes redeem process when vesting duration has been reached
     *
     * Can only be called by the redeem entry owner
     */
    function finalizeRedeem(uint256 redeemIndex) external;

    /**
     * @dev Updates dividends address for an existing active redeeming process
     *
     * Can only be called by the involved user
     * Should only be used if dividends contract was to be migrated
     */
    function updateRedeemDividendsAddress(uint256 redeemIndex) external;

    /**
     * @dev Cancels an ongoing redeem entry
     *
     * Can only be called by its owner
     */
    function cancelRedeem(uint256 redeemIndex) external;

    /**
     * @dev Allocates caller's "amount" of available xToken to "usageAddress" contract
     *
     * args specific to usage contract must be passed into "usageData"
     */
    function allocate(address usageAddress, uint256 amount, bytes calldata usageData) external;

    /**
     * @dev Allocates "amount" of available xToken from "userAddress" to caller (ie usage contract)
     *
     * Caller must have an allocation approval for the required xToken from "userAddress"
     */
    function allocateFromUsage(address userAddress, uint256 amount) external;

    /**
     * @dev Deallocates caller's "amount" of available xToken from "usageAddress" contract
     *
     * args specific to usage contract must be passed into "usageData"
     */
    function deallocate(address usageAddress, uint256 amount, bytes calldata usageData) external;

    /**
     * @dev Deallocates "amount" of allocated xToken belonging to "userAddress" from caller (ie usage contract)
     *
     * Caller can only deallocate xToken from itself
     */
    function deallocateFromUsage(address userAddress, uint256 amount) external;
}

library BaseSwapLibrary {

    function getAmountOut(
        address baseSwapRouter,
        address inputToken,
        address outputToken,
        uint256 amountInput
    ) internal view returns (uint256) {

        address[] memory path = new address[](2);
        path[0] = inputToken;
        path[1] = outputToken;

        uint[] memory amounts = IBaseSwapRouter02(baseSwapRouter).getAmountsOut(amountInput, path);

        return amounts[1];
    }

    function getAmountOut(
        address baseSwapRouter,
        address inputToken,
        address middleToken,
        address outputToken,
        uint256 amountInput
    ) internal view returns (uint256) {

        address[] memory path = new address[](3);
        path[0] = inputToken;
        path[1] = middleToken;
        path[2] = outputToken;

        uint[] memory amounts = IBaseSwapRouter02(baseSwapRouter).getAmountsOut(amountInput, path);

        return amounts[2];
    }

    function getAmountOut(
        address baseSwapRouter,
        address inputToken,
        address middleToken0,
        address middleToken1,
        address outputToken,
        uint256 amountInput
    ) internal view returns (uint256) {

        address[] memory path = new address[](4);
        path[0] = inputToken;
        path[1] = middleToken0;
        path[2] = middleToken1;
        path[3] = outputToken;

        uint[] memory amounts = IBaseSwapRouter02(baseSwapRouter).getAmountsOut(amountInput, path);

        return amounts[3];
    }

    function singleSwap(
        address baseSwapRouter,
        address inputToken,
        address outputToken,
        uint256 amountInput,
        uint256 amountOutMin,
        address recipient
    ) internal returns (uint256) {

        IERC20(inputToken).approve(baseSwapRouter, amountInput);

        address[] memory path = new address[](2);
        path[0] = inputToken;
        path[1] = outputToken;

        uint[] memory amounts = IBaseSwapRouter02(baseSwapRouter).swapExactTokensForTokens(
            amountInput,
            amountOutMin,
            path,
            recipient,
            block.timestamp
        );

        return amounts[1];
    }

    function multiSwap(
        address baseSwapRouter,
        address inputToken,
        address middleToken,
        address outputToken,
        uint256 amountInput,
        uint256 amountOutMin,
        address recipient
    ) internal returns (uint256) {

        IERC20(inputToken).approve(baseSwapRouter, amountInput);

        address[] memory path = new address[](3);
        path[0] = inputToken;
        path[1] = middleToken;
        path[2] = outputToken;

        uint[] memory amounts = IBaseSwapRouter02(baseSwapRouter).swapExactTokensForTokens(
            amountInput,
            amountOutMin,
            path,
            recipient,
            block.timestamp
        );

        return amounts[2];
    }

    function multiSwap(
        address baseSwapRouter,
        address inputToken,
        address middleToken0,
        address middleToken1,
        address outputToken,
        uint256 amountInput,
        uint256 amountOutMin,
        address recipient
    ) internal returns (uint256) {

        IERC20(inputToken).approve(baseSwapRouter, amountInput);

        address[] memory path = new address[](4);
        path[0] = inputToken;
        path[1] = middleToken0;
        path[2] = middleToken1;
        path[3] = outputToken;

        uint[] memory amounts = IBaseSwapRouter02(baseSwapRouter).swapExactTokensForTokens(
            amountInput,
            amountOutMin,
            path,
            recipient,
            block.timestamp
        );

        return amounts[3];
    }

}
