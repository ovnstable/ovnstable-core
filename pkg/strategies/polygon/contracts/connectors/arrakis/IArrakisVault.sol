pragma solidity >=0.8.0 <0.9.0;

interface IArrakisVault {

    function getUnderlyingBalances()
    external
    view
    returns (uint256 amount0, uint256 amount1);

    function getPositionID() external view returns (bytes32 positionID);

    function token0() external view returns (address token);

    function token1() external view returns (address token);

    function upperTick() external view returns (int24);

    function lowerTick() external view returns (int24);

    function pool() external view returns (address pool);

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function getMintAmounts(uint256 amount0Max, uint256 amount1Max)
    external
    view
    returns (
        uint256 amount0,
        uint256 amount1,
        uint256 mintAmount
    );

}
