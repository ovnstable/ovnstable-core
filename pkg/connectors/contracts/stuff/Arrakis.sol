// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IGauge is IERC20 {

    function deposit(uint256 amount, address account) external;

    function withdraw(uint256 amount) external;

    // solhint-disable-next-line func-name-mixedcase
    function claim_rewards(address account) external;

    // solhint-disable-next-line func-name-mixedcase
    function staking_token() external returns (address);
}

interface IArrakisV1RouterStaking {

    function addLiquidity(
        IArrakisVaultV1 pool,
        uint256 amount0Max,
        uint256 amount1Max,
        uint256 amount0Min,
        uint256 amount1Min,
        uint256 amountSharesMin,
        address receiver
    )
    external
    returns (
        uint256 amount0,
        uint256 amount1,
        uint256 mintAmount
    );

    function addLiquidityETH(
        IArrakisVaultV1 pool,
        uint256 amount0Max,
        uint256 amount1Max,
        uint256 amount0Min,
        uint256 amount1Min,
        uint256 amountSharesMin,
        address receiver
    )
    external
    payable
    returns (
        uint256 amount0,
        uint256 amount1,
        uint256 mintAmount
    );

    function addLiquidityAndStake(
        IGauge gauge,
        uint256 amount0Max,
        uint256 amount1Max,
        uint256 amount0Min,
        uint256 amount1Min,
        uint256 amountSharesMin,
        address receiver
    )
    external
    returns (
        uint256 amount0,
        uint256 amount1,
        uint256 mintAmount
    );

    function addLiquidityETHAndStake(
        IGauge gauge,
        uint256 amount0Max,
        uint256 amount1Max,
        uint256 amount0Min,
        uint256 amount1Min,
        uint256 amountSharesMin,
        address receiver
    )
    external
    payable
    returns (
        uint256 amount0,
        uint256 amount1,
        uint256 mintAmount
    );

    function removeLiquidity(
        IArrakisVaultV1 pool,
        uint256 burnAmount,
        uint256 amount0Min,
        uint256 amount1Min,
        address receiver
    )
    external
    returns (
        uint256 amount0,
        uint256 amount1,
        uint128 liquidityBurned
    );

    function removeLiquidityETH(
        IArrakisVaultV1 pool,
        uint256 burnAmount,
        uint256 amount0Min,
        uint256 amount1Min,
        address payable receiver
    )
    external
    returns (
        uint256 amount0,
        uint256 amount1,
        uint128 liquidityBurned
    );

    function removeLiquidityAndUnstake(
        IGauge gauge,
        uint256 burnAmount,
        uint256 amount0Min,
        uint256 amount1Min,
        address receiver
    )
    external
    returns (
        uint256 amount0,
        uint256 amount1,
        uint128 liquidityBurned
    );

    function removeLiquidityETHAndUnstake(
        IGauge gauge,
        uint256 burnAmount,
        uint256 amount0Min,
        uint256 amount1Min,
        address payable receiver
    )
    external
    returns (
        uint256 amount0,
        uint256 amount1,
        uint128 liquidityBurned
    );
}

interface IArrakisVaultV1 {

    function mint(uint256 mintAmount, address receiver)
    external
    returns (
        uint256 amount0,
        uint256 amount1,
        uint128 liquidityMinted
    );

    function burn(uint256 burnAmount, address receiver)
    external
    returns (
        uint256 amount0,
        uint256 amount1,
        uint128 liquidityBurned
    );

    function getMintAmounts(uint256 amount0Max, uint256 amount1Max)
    external
    view
    returns (
        uint256 amount0,
        uint256 amount1,
        uint256 mintAmount
    );

    function getUnderlyingBalances()
    external
    view
    returns (uint256 amount0, uint256 amount1);

    function getUnderlyingBalancesAtPrice(uint160 sqrtRatioX96)
    external
    view
    returns (uint256 amount0Current, uint256 amount1Current);

    function getPositionID() external view returns (bytes32 positionID);

    function token0() external view returns (address);

    function token1() external view returns (address);

    function upperTick() external view returns (int24);

    function lowerTick() external view returns (int24);

    function pool() external view returns (address);

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);
}
