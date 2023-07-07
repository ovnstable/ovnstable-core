// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IDefiEdgeTwapStrategy is IERC20Metadata {

    struct Tick {
        int24 tickLower;
        int24 tickUpper;
    }

    struct PartialTick {
        uint256 index;
        bool burn;
        uint256 amount0;
        uint256 amount1;
    }

    struct NewTick {
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0;
        uint256 amount1;
    }

    /**
     * @notice Adds liquidity to the primary range
     * @param _amount0 Amount of token0
     * @param _amount1 Amount of token1
     * @param _amount0Min Minimum amount of token0 to be minted
     * @param _amount1Min Minimum amount of token1 to be minted
     * @param _minShare Minimum amount of shares to be received to the user
     */
    function mint(
        uint256 _amount0,
        uint256 _amount1,
        uint256 _amount0Min,
        uint256 _amount1Min,
        uint256 _minShare
    ) external
    returns (
        uint256 amount0,
        uint256 amount1,
        uint256 share
    );

    /**
     * @notice Burn liquidity and transfer tokens back to the user
     * @param _shares Shares to be burned
     * @param _amount0Min Mimimum amount of token0 to be received
     * @param _amount1Min Minimum amount of token1 to be received
     */
    function burn(
        uint256 _shares,
        uint256 _amount0Min,
        uint256 _amount1Min
    ) external returns (uint256 collect0, uint256 collect1);

    /**
     * @notice Rebalances the strategy
     * @param _swapData Swap data to perform exchange from 1inch
     * @param _existingTicks Array of existing ticks to rebalance
     * @param _newTicks New ticks in case there are any
     * @param _burnAll When burning into new ticks, should we burn all liquidity?
     */
    function rebalance(
        bytes calldata _swapData,
        PartialTick[] calldata _existingTicks,
        NewTick[] calldata _newTicks,
        bool _burnAll
    ) external;

    /**
     * @notice Withdraws funds from the contract in case of emergency
     * @dev only governance can withdraw the funds, it can be frozen from the factory permenently
     * @param _token Token to transfer
     * @param _to Where to transfer the token
     * @param _amount Amount to be withdrawn
     * @param _newTicks Ticks data to burn liquidity from
     */
    function emergencyWithdraw(
        address _token,
        address _to,
        uint256 _amount,
        NewTick[] calldata _newTicks
    ) external;

    /**
     * @notice Burn liquidity from specific tick, used for limit orders
     * @param _tickIndex Index of tick which needs to be burned
     * @return amount0 Amount of token0's liquidity burned
     * @return amount1 Amount of token1's liquidity burned
     * @return fee0 Fee of token0 accumulated in the position which is being burned
     * @return fee1 Fee of token1 accumulated in the position which is being burned
     */
    function burnLiquiditySingle(uint256 _tickIndex)
    external
    returns (
        uint256 amount0,
        uint256 amount1,
        uint256 fee0,
        uint256 fee1
    );

    /**
     * @notice Swap the funds to 1Inch
     * @param data Swap data to perform exchange from 1inch
     */
    function swap(bytes calldata data) external;

    /**
     * @dev Callback for Uniswap V3 pool.
     */
    function uniswapV3MintCallback(
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;

    /**
     * @notice Get's assets under management with realtime fees
     * @param _includeFee Whether to include pool fees in AUM or not. (passing true will also collect fees from pool)
     */
    function getAUMWithFees(bool _includeFee)
    external
    returns (
        uint256 amount0,
        uint256 amount1,
        uint256 totalFee0,
        uint256 totalFee1
    );
    
    function pool() external view returns (address);

    /**
     * @notice Claims the fee for protocol and management
     * Protocol receives X percentage from manager fee
     */
    function claimFee() external;

    /**
     * @notice Returns the current ticks
     */
    function getTicks() external view returns (Tick[] memory);
}