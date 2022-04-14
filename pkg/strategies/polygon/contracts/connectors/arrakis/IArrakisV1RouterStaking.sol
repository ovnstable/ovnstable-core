pragma solidity >=0.8.0 <0.9.0;

interface IArrakisV1RouterStaking {

    function addLiquidityAndStake(
        address gauge,
        uint256 amount0Max,
        uint256 amount1Max,
        uint256 amount0Min,
        uint256 amount1Min,
        address receiver
    )
    external
    returns (
        uint256 amount0,
        uint256 amount1,
        uint256 mintAmount
    );


    function removeLiquidityAndUnstake(
        address gauge,
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


}
