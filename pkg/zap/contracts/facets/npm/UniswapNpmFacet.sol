//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";
import "../../libraries/core/LibCoreStorage.sol";
import "../../interfaces/Modifiers.sol";
import "../../interfaces/core/INpmFacet.sol";
import "../../interfaces/Constants.sol";
import "hardhat/console.sol";

contract UniswapNpmFacet is INpmFacet, Modifiers {

    function mintPosition(
        address pair,
        int24 tickRange0,
        int24 tickRange1,
        uint256 amountOut0,
        uint256 amountOut1,
        address recipient
    ) external onlyDiamond returns (uint256 tokenId) {
        ICLPool pool = ICLPool(pair);
        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0: pool.token0(),
            token1: pool.token1(),
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

    function increaseLiquidity(
        uint256 tokenId,
        uint256 amount0,
        uint256 amount1
    ) external onlyDiamond returns (uint128 liquidity) {
        INonfungiblePositionManager.IncreaseLiquidityParams memory params = INonfungiblePositionManager.IncreaseLiquidityParams({
            tokenId: tokenId,
            amount0Desired: amount0,
            amount1Desired: amount1,
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp
        });
        (liquidity,,) = getNpm().increaseLiquidity(params);
    }

    function closePosition(uint256 tokenId, address recipient, address feeRecipient) onlyDiamond external {
        INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager.DecreaseLiquidityParams({
            tokenId: tokenId,
            liquidity: getLiquidity(tokenId),
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp
        });
        (uint256 fee0, uint256 fee1) = collectRewards(tokenId, feeRecipient);
        emit CollectRewards(fee0, fee1);
        if (params.liquidity > 0) {
            getNpm().decreaseLiquidity(params);
        }
        collectRewards(tokenId, recipient);
        getNpm().burn(tokenId);
    }

    function getPositions(address wallet) external view returns (PositionInfo[] memory result) {
        uint256 gaugePositionsLength = calculateGaugePositionsLength(wallet);
        uint256 validPositionsLength = calculateUserPositionsLength(wallet);
        uint256 positionsLength = getNpm().balanceOf(wallet);
        uint256 positionCount;
        result = new PositionInfo[](gaugePositionsLength + validPositionsLength);
        ICLFactory factory = ICLFactory(getNpm().factory());
        uint256 poolsLength = factory.allPoolsLength();

        for (uint256 i = 0; i < poolsLength; i++) {
            ICLPool pool = ICLPool(factory.allPools(i));
            if (pool.gauge() == address(0)) {
                continue;
            }
            ICLGauge gauge = ICLGauge(pool.gauge());
            uint256[] memory tokenIds = gauge.stakedValues(wallet);
            for (uint j = 0; j < tokenIds.length; j++) {
                if (getLiquidity(tokenIds[j]) > 0) {
                    result[positionCount] = getPositionInfo(wallet, tokenIds[j]);
                    result[positionCount].isStaked = true;
                    positionCount++;
                }
            }
        }

        for (uint256 i = 0; i < positionsLength; i++) {
            uint256 tokenId = getNpm().tokenOfOwnerByIndex(wallet, i);
            if (getLiquidity(tokenId) > 0) {
                result[positionCount] = getPositionInfo(wallet, tokenId);
                positionCount++;
            }
        }
        return result;
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

    function getPositionAmounts(uint256 tokenId) external view returns (uint256, uint256) {
        return _getPositionAmounts(tokenId);
    }

    function getTokens(uint256 tokenId) external onlyDiamond view returns (address, address) {
       return _getTokens(tokenId);
    }

    function getPositionTicks(uint256 tokenId) public view returns (int24 tickLower, int24 tickUpper) {
        (,,,,, tickLower, tickUpper,,,,,) = getNpm().positions(tokenId);
    }

    function getPool(uint256 tokenId) external onlyDiamond view returns (address) {
        return _getPool(tokenId);
    }

    function getNpm() internal view returns (INonfungiblePositionManager) {
        return INonfungiblePositionManager(LibCoreStorage.coreStorage().npm);
    }

    function _getTokens(uint256 tokenId) internal view returns (address token0, address token1) {
        (,, token0, token1,,,,,,,,) = getNpm().positions(tokenId);
    }

    function _getPool(uint256 tokenId) internal view returns (address poolId) {
        (address token0, address token1) = _getTokens(tokenId);
        poolId = PoolAddress.computeAddress(getNpm().factory(),
            PoolAddress.getPoolKey(token0, token1, getTickSpacing(tokenId)));
    }

    function getTickSpacing(uint256 tokenId) internal view returns (int24 tickSpacing) {
        (,,,, tickSpacing,,,,,,,) = getNpm().positions(tokenId);
    }

    function getLiquidity(uint256 tokenId) internal view returns (uint128 liquidity) {
        (,,,,,,, liquidity,,,,) = getNpm().positions(tokenId);
    }

    function getFees(uint256 tokenId) internal view returns (uint256 fee0, uint256 fee1) {
        (fee0, fee1) = PositionValue.fees(getNpm(), tokenId);
    }

    function _getPositionAmounts(uint256 tokenId) internal view returns (uint256 amount0, uint256 amount1) {
        address poolId = _getPool(tokenId);
        (int24 tickLower, int24 tickUpper) = getPositionTicks(tokenId);
        (uint160 sqrtRatioX96,,,,,) = IUniswapV3Pool(poolId).slot0();
        (amount0, amount1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtRatioX96,
            TickMath.getSqrtRatioAtTick(tickLower),
            TickMath.getSqrtRatioAtTick(tickUpper),
            getLiquidity(tokenId)
        );
    }

    function getPositionInfo(address wallet, uint256 tokenId) internal view returns (PositionInfo memory) {
        PositionInfo memory result;
        result.platform = "Aerodrome";
        result.tokenId = tokenId;
        (result.token0, result.token1) = _getTokens(tokenId);
        (result.tickLower, result.tickUpper) = getPositionTicks(tokenId);
        result.poolId = _getPool(tokenId);
        ICLPool pool = ICLPool(result.poolId);
        (, result.currentTick,,,,) = pool.slot0();
        (result.amount0, result.amount1) = _getPositionAmounts(tokenId);
        (result.fee0, result.fee1) = getFees(tokenId);
        if (pool.gauge() != address(0)) {
            ICLGauge gauge = ICLGauge(pool.gauge());
            if (gauge.stakedContains(wallet, tokenId)) {
                result.emissions = gauge.earned(wallet, tokenId) + gauge.rewards(tokenId);
            }
        }
        return result;
    }

    function collectRewards(uint256 tokenId, address recipient) internal returns (uint256, uint256) {
        INonfungiblePositionManager.CollectParams memory collectParams = INonfungiblePositionManager.CollectParams({
            tokenId: tokenId,
            recipient: recipient,
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        });
        return getNpm().collect(collectParams);
    }

    function calculateGaugePositionsLength(address wallet) internal view returns (uint256 length) {
        length = 0;
        ICLFactory factory = ICLFactory(getNpm().factory());
        uint256 poolsLength = factory.allPoolsLength();
        for (uint256 i = 0; i < poolsLength; i++) {
            ICLPool pool = ICLPool(factory.allPools(i));
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
