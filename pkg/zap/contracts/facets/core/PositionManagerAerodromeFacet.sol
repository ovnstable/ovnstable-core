//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";
import "../../libraries/core/LibCoreStorage.sol";
import "../../interfaces/Modifiers.sol";
import "../../interfaces/core/IPositionManagerFacet.sol";
import "../../interfaces/Constants.sol";
import "hardhat/console.sol";

contract PositionManagerAerodromeFacet is IPositionManagerFacet, Modifiers {
    function mintPosition(
        address pair,
        int24 tickRange0,
        int24 tickRange1,
        uint256 amountOut0,
        uint256 amountOut1
    ) external onlyDiamond returns (uint256 tokenId) {
        INonfungiblePositionManager manager = INonfungiblePositionManager(LibCoreStorage.coreStorage().npm);
        IUniswapV3Pool pool = IUniswapV3Pool(pair);
        address token0 = pool.token0();
        address token1 = pool.token1();
        (tokenId,,,) = manager.mint(INonfungiblePositionManager.MintParams(token0, token1, pool.tickSpacing(),
            tickRange0, tickRange1, amountOut0, amountOut1, 0, 0, msg.sender, block.timestamp, 0));
    }

    function getPositions(address wallet) external view returns (PositionInfo[] memory result) {
        INonfungiblePositionManager manager = getNpm();
        uint256 numPositions = manager.balanceOf(wallet);
        result = new PositionInfo[](numPositions);
        for (uint256 i = 0; i < numPositions; i++) {
            result[i].tokenId = manager.tokenOfOwnerByIndex(wallet, i);
            result[i].platform = "Aerodrome";
            (result[i].token0, result[i].token1) = getTokens(result[i].tokenId);
            (result[i].tickLower, result[i].tickUpper) = getTicks(result[i].tokenId);
            (result[i].rewardAmount0, result[i].rewardAmount1) = getTokensOwed(result[i].tokenId);

            result[i].poolId = PoolAddress.computeAddress(
                AERODROME_FACTORY,
                PoolAddress.getPoolKey(result[i].token0, result[i].token1, getTickSpacing(result[i].tokenId))
            );
            (uint160 sqrtRatioX96,,,,,) = IUniswapV3Pool(result[i].poolId).slot0();
            (result[i].amount0, result[i].amount1) = LiquidityAmounts.getAmountsForLiquidity(
                sqrtRatioX96,
                TickMath.getSqrtRatioAtTick(result[i].tickLower),
                TickMath.getSqrtRatioAtTick(result[i].tickUpper),
                getLiquidity(result[i].tokenId)
            );
        }
    }

    function getNpm() internal view returns (INonfungiblePositionManager) {
        return INonfungiblePositionManager(LibCoreStorage.coreStorage().npm);
    }

    function getTokens(uint256 tokenId) internal view returns (address token0, address token1) {
        (,, token0, token1,,,,,,,,) = getNpm().positions(tokenId);
    }

    function getTickSpacing(uint256 tokenId) internal view returns (int24 tickSpacing) {
        (,,,, tickSpacing,,,,,,,) = getNpm().positions(tokenId);
    }

    function getTicks(uint256 tokenId) internal view returns (int24 tickLower, int24 tickUpper) {
        (,,,,, tickLower, tickUpper,,,,,) = getNpm().positions(tokenId);
    }

    function getLiquidity(uint256 tokenId) internal view returns (uint128 liquidity) {
        (,,,,,,, liquidity,,,,) = getNpm().positions(tokenId);
    }

    function getTokensOwed(uint256 tokenId) internal view returns (uint128 tokensOwed0, uint128 tokensOwed1) {
        (,,,,,,,,,, tokensOwed0, tokensOwed1) = getNpm().positions(tokenId);
    }
}
