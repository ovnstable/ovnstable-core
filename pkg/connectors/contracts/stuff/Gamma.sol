// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IHypervisor {

    function deposit(
        uint256,
        uint256,
        address,
        address,
        uint256[4] memory minIn
    ) external returns (uint256);

    function withdraw(
        uint256,
        address,
        address,
        uint256[4] memory
    ) external returns (uint256, uint256);

    function rebalance(
        int24 _baseLower,
        int24 _baseUpper,
        int24 _limitLower,
        int24 _limitUpper,
        address _feeRecipient,
        uint256[4] memory minIn,
        uint256[4] memory outMin
    ) external;

    function addBaseLiquidity(
        uint256 amount0,
        uint256 amount1,
        uint256[2] memory minIn
    ) external;

    function addLimitLiquidity(
        uint256 amount0,
        uint256 amount1,
        uint256[2] memory minIn
    ) external;

    function pullLiquidity(
        uint256 shares,
        uint256[4] memory minAmounts
    ) external returns (
        uint256 base0,
        uint256 base1,
        uint256 limit0,
        uint256 limit1
    );

    function compound() external returns (

        uint128 baseToken0Owed,
        uint128 baseToken1Owed,
        uint128 limitToken0Owed,
        uint128 limitToken1Owed
    );

    function pool() external view returns (address);

    function currentTick() external view returns (int24 tick);

    function token0() external view returns (IERC20);

    function token1() external view returns (IERC20);

    function deposit0Max() external view returns (uint256);

    function deposit1Max() external view returns (uint256);

    function balanceOf(address) external view returns (uint256);

    function approve(address, uint256) external returns (bool);

    function transferFrom(address, address, uint256) external returns (bool);

    function transfer(address, uint256) external returns (bool);

    function getTotalAmounts() external view returns (uint256 total0, uint256 total1);

    function totalSupply() external view returns (uint256 );

    function setWhitelist(address _address) external;

    function removeWhitelisted() external;

    function transferOwnership(address newOwner) external;

}

/// @title UniProxy
/// @notice Proxy contract for hypervisor positions management
interface IUniProxy {

    /// @notice Deposit into the given position
    /// @param deposit0 Amount of token0 to deposit
    /// @param deposit1 Amount of token1 to deposit
    /// @param to Address to receive liquidity tokens
    /// @param pos Hypervisor Address
    /// @return shares Amount of liquidity tokens received
    function deposit(
        uint256 deposit0,
        uint256 deposit1,
        address to,
        address pos,
        uint256[4] memory minIn
    ) external returns (uint256 shares);

    /// @notice Get the amount of token to deposit for the given amount of pair token
    /// @param pos Hypervisor Address
    /// @param token Address of token to deposit
    /// @param _deposit Amount of token to deposit
    /// @return amountStart Minimum amounts of the pair token to deposit
    /// @return amountEnd Maximum amounts of the pair token to deposit
    function getDepositAmount(
        address pos,
        address token,
        uint256 _deposit
    ) external view returns (uint256 amountStart, uint256 amountEnd);

    /// @notice Check if the price change overflows or not based on given twap and threshold in the hypervisor
    /// @param pos Hypervisor Address
    /// @param _twapInterval Time intervals
    /// @param _priceThreshold Price Threshold
    /// @return price Current price
    function checkPriceChange(
        address pos,
        uint32 _twapInterval,
        uint256 _priceThreshold
    ) external view returns (uint256 price);

    /// @notice Get the sqrt price before the given interval
    /// @param pos Hypervisor Address
    /// @param _twapInterval Time intervals
    /// @return sqrtPriceX96 Sqrt price before interval
    function getSqrtTwapX96(address pos, uint32 _twapInterval) external view returns (uint160 sqrtPriceX96);

}

// MasterChef is the master of Sushi. He can make Sushi and he is a fair guy.
//
// Note that it's ownable and the owner wields tremendous power. The ownership
// will be transferred to a governance smart contract once SUSHI is sufficiently
// distributed and the community can show to govern itself.
//
// Have fun reading it. Hopefully it's bug-free. God bless.
interface IMasterChef {

    // Info of each user that stakes LP tokens.
    function userInfo(uint256 _pid, address _user) external view returns (uint256 amount, uint256 rewardDebt);

    // Deposit LP tokens to MasterChef for SUSHI allocation.
    function deposit(uint256 _pid, uint256 _amount) external;

    // Withdraw LP tokens from MasterChef.
    function withdraw(uint256 _pid, uint256 _amount) external;

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _pid) external;

}