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
        uint256 amountOut1,
        address recipient
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
            recipient: recipient,
            deadline: block.timestamp,
            sqrtPriceX96: 0
        });
        (tokenId,,,) = getNpm().mint(params);
    }

    function getPositions(address wallet) external view returns (PositionInfo[] memory result) {
        uint256 gaugePositionsLength = calculateGaugePositionsLength(wallet);
        uint256 positionsLength = calculateUserPositionsLength(wallet);
        uint256 positionCount;
        result = new PositionInfo[](gaugePositionsLength + positionsLength);
        ICLFactory factory = ICLFactory(getNpm().factory());
        uint256 poolsLength = factory.allPoolsLength();

        for (uint256 i = 0; i < poolsLength; i++) {
            ICLPoolConstants pool = ICLPoolConstants(factory.allPools(i));
            if (pool.gauge() == address(0)) {
                continue;
            }
            ICLGauge gauge = ICLGauge(pool.gauge());
            uint256[] memory tokenIds = gauge.stakedValues(wallet);
            for (uint j = 0; j < tokenIds.length; j++) {
                if (getLiquidity(tokenIds[j]) > 0) {
                    result[positionCount] = getPositionInfo(tokenIds[j]);
                    positionCount++;
                }
            }
        }

        for (uint256 i = 0; i < positionsLength; i++) {
            uint256 tokenId = getNpm().tokenOfOwnerByIndex(wallet, i);
            if (getLiquidity(tokenId) > 0) {
                result[positionCount] = getPositionInfo(tokenId);
                positionCount++;
            }
        }
        return result;
    }

    function closePosition(uint256 tokenId, address recipient, address feeRecipient) onlyDiamond external {
        INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager.DecreaseLiquidityParams({
            tokenId: tokenId,
            liquidity: getLiquidity(tokenId),
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp
        });
        collectRewards(tokenId, feeRecipient);
        if (params.liquidity > 0) {
            getNpm().decreaseLiquidity(params);
        }
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
        address poolId = PoolAddress.computeAddress(getNpm().factory(),
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

    function getPositionInfo(uint256 tokenId) internal view returns (PositionInfo memory) {
        PositionInfo memory result;
        result.platform = "Aerodrome";
        result.tokenId = tokenId;
        (result.token0, result.token1) = getTokens(tokenId);
        (result.tickLower, result.tickUpper) = getTicks(tokenId);
        (result.rewardAmount0, result.rewardAmount1) = getTokensOwed(tokenId);
        result.poolId = PoolAddress.computeAddress(
            getNpm().factory(),
            PoolAddress.getPoolKey(result.token0, result.token1, getTickSpacing(tokenId))
        );
        (, result.currentTick,,,,) = IUniswapV3Pool(result.poolId).slot0();
        (result.amount0, result.amount1) = getPositionAmounts(tokenId);
        return result;
    }

    function collectRewards(uint256 tokenId, address recipient) internal {
        INonfungiblePositionManager.CollectParams memory collectParams = INonfungiblePositionManager.CollectParams({
            tokenId: tokenId,
            recipient: recipient,
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        });
        (uint256 amount0, uint256 amount1) = getNpm().collect(collectParams);
        emit CollectRewards(amount0, amount1);
    }

    function calculateGaugePositionsLength(address wallet) internal view returns (uint256 length) {
        length = 0;
        ICLFactory factory = ICLFactory(getNpm().factory());
        uint256 poolsLength = factory.allPoolsLength();
        for (uint256 i = 0; i < poolsLength; i++) {
            ICLPoolConstants pool = ICLPoolConstants(factory.allPools(i));
            if (pool.gauge() == address(0)) {
                continue;
            }
            ICLGauge gauge = ICLGauge(pool.gauge());
            uint256 gaugePositionsLength = gauge.stakedLength(wallet);
            uint256[] memory tokenIds = gauge.stakedValues(wallet);
            for (uint j = 0; j < gaugePositionsLength; j++) {
                if (getLiquidity(tokenIds[j]) > 0) {
                    length++;
                }
            }
        }
    }

    function calculateUserPositionsLength(address wallet) internal view returns (uint256 length) {
        length = 0;
        uint256 positionsLength = getNpm().balanceOf(wallet);
        for (uint256 i = 0; i < positionsLength; i++) {
            uint256 tokenId = getNpm().tokenOfOwnerByIndex(wallet, i);
            if (getLiquidity(tokenId) > 0) {
                length++;
            }
        }
    }
}
