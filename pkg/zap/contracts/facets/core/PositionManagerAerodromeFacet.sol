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
    event CollectRewards(uint256 amount0, uint256 amount1);

    function mintPosition(
        address pair,
        int24 tickRange0,
        int24 tickRange1,
        uint256 amountOut0,
        uint256 amountOut1
    ) external onlyDiamond returns (uint256 tokenId) {
        IUniswapV3Pool pool = IUniswapV3Pool(pair);
        address token0 = pool.token0();
        address token1 = pool.token1();
        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0: token0,
            token1: token1,
            tickSpacing: pool.tickSpacing(),
            tickLower: tickRange0,
            tickUpper: tickRange1,
            amount0Desired: amountOut0,
            amount1Desired: amountOut1,
            amount0Min: 0,
            amount1Min: 0,
            recipient: msg.sender,
            deadline: block.timestamp,
            sqrtPriceX96: 0
        });
        (tokenId,,,) = getNpm().mint(params);
    }

    function getPositions(address wallet) external view returns (PositionInfo[] memory result) {
        uint256 numPositions = getNpm().balanceOf(wallet);
        result = new PositionInfo[](numPositions);
        for (uint256 i = 0; i < numPositions; i++) {
            result[i].tokenId = getNpm().tokenOfOwnerByIndex(wallet, i);
            result[i].platform = "Aerodrome";
            (result[i].token0, result[i].token1) = getTokens(result[i].tokenId);
            (result[i].tickLower, result[i].tickUpper) = getTicks(result[i].tokenId);
            (result[i].rewardAmount0, result[i].rewardAmount1) = getTokensOwed(result[i].tokenId);

            result[i].poolId = PoolAddress.computeAddress(
                AERODROME_FACTORY,
                PoolAddress.getPoolKey(result[i].token0, result[i].token1, getTickSpacing(result[i].tokenId))
            );
            (, result[i].currentTick,,,,) = IUniswapV3Pool(result[i].poolId).slot0();
            (result[i].amount0, result[i].amount1) = getPositionAmounts(result[i].tokenId);
        }
    }

    function closePosition(uint256 tokenId, address recipient) onlyDiamond external {
        INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager.DecreaseLiquidityParams({
            tokenId: tokenId,
            liquidity: getLiquidity(tokenId),
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp
        });
        getNpm().decreaseLiquidity(params);
        collectRewards(tokenId, recipient);
        getNpm().burn(tokenId);
    }

    function getPositionVolume(uint256 tokenId) external view
    returns (uint256, uint256) {
        (uint128 tokensOwed0, uint128 tokensOwed1) = getTokensOwed(tokenId);
        (uint256 amount0, uint256 amount1) = getPositionAmounts(tokenId);
        return (amount0 + tokensOwed0, amount1 + tokensOwed1);
    }

    function checkForOwner(uint256 tokenId, address sender) external view {
        bool ownerFound = false;
        uint256 numPositions = getNpm().balanceOf(sender);
        for (uint256 i = 0; i < numPositions; i++) {
            uint256 curTokenId = getNpm().tokenOfOwnerByIndex(sender, i);
            if (tokenId == curTokenId) {
                ownerFound = true;
                break;
            }
        }
        require(ownerFound, "Caller doesn't own the token");
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

    function getPositionAmounts(uint256 tokenId) internal view returns (uint256 amount0, uint256 amount1) {
        (address token0, address token1) = getTokens(tokenId);
        address poolId = PoolAddress.computeAddress(AERODROME_FACTORY,
            PoolAddress.getPoolKey(token0, token1, getTickSpacing(tokenId)));
        (int24 tickLower, int24 tickUpper) = getTicks(tokenId);
        (uint160 sqrtRatioX96,,,,,) = IUniswapV3Pool(poolId).slot0();
        (amount0, amount1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtRatioX96,
            TickMath.getSqrtRatioAtTick(tickLower),
            TickMath.getSqrtRatioAtTick(tickUpper),
            getLiquidity(tokenId)
        );
    }

    function collectRewards(uint256 tokenId, address recipient) internal {
        (uint128 tokensOwed0, uint128 tokensOwed1) = getTokensOwed(tokenId);
        INonfungiblePositionManager.CollectParams memory collectParams = INonfungiblePositionManager.CollectParams({
            tokenId: tokenId,
            recipient: recipient,
            amount0Max: tokensOwed0,
            amount1Max: tokensOwed1
        });
        (uint256 amount0, uint256 amount1) = getNpm().collect(collectParams);
        emit CollectRewards(amount0, amount1);
    }
}
