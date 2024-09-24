//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@overnight-contracts/connectors/contracts/stuff/PancakeV3.sol";
import "../../libraries/core/LibCoreStorage.sol";
import "../../interfaces/Modifiers.sol";
import "../../interfaces/core/INpmFacet.sol";
import "../../interfaces/Constants.sol";
import "hardhat/console.sol";

contract PancakeNpmFacet is INpmFacet, Modifiers {

    function mintPosition(
        address pair,
        int24 tickRange0,
        int24 tickRange1,
        uint256 amountOut0,
        uint256 amountOut1,
        address recipient
    ) external onlyDiamond returns (uint256 tokenId) {
        IPancakeV3Pool pool = IPancakeV3Pool(pair);
        MintParams memory params = MintParams({
            token0: pool.token0(),
            token1: pool.token1(),
            fee: pool.fee(),
            tickLower: tickRange0,
            tickUpper: tickRange1,
            amount0Desired: amountOut0,
            amount1Desired: amountOut1,
            amount0Min: 0,
            amount1Min: 0,
            recipient: recipient,
            deadline: block.timestamp
        });
        (tokenId,,,) = getNpm().mint(params);
    }

    function increaseLiquidity(
        uint256 tokenId,
        uint256 amount0,
        uint256 amount1
    ) external onlyDiamond returns (uint128 liquidity) {
        IncreaseLiquidityParams memory params = IncreaseLiquidityParams({
            tokenId: tokenId,
            amount0Desired: amount0,
            amount1Desired: amount1,
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp
        });
        (liquidity,,) = getNpm().increaseLiquidity(params);
    }

    function getPositions(address wallet) external view returns (PositionInfo[] memory result) {
        uint256 validChefPositionsLength = calculateChefPositionsLength(wallet);
        uint256 validUserPositionsLength = calculateUserPositionsLength(wallet);
        uint256 userPositionsLength = getNpm().balanceOf(wallet);
        uint256 positionCount;
        result = new PositionInfo[](validChefPositionsLength + validUserPositionsLength);

        IMasterChefV3 masterChef = IMasterChefV3(LibCoreStorage.coreStorage().masterChefV3);
        uint256 chefPositionsLength = masterChef.balanceOf(wallet);
        for (uint256 i = 0; i < chefPositionsLength; i++) {
            uint256 tokenId = masterChef.tokenOfOwnerByIndex(wallet, i);
            if (getLiquidity(tokenId) > 0) {
                result[positionCount] = getPositionInfo(tokenId);
                result[positionCount].isStaked = true;
                positionCount++;
            }
        }

        for (uint256 i = 0; i < userPositionsLength; i++) {
            uint256 tokenId = getNpm().tokenOfOwnerByIndex(wallet, i);
            if (getLiquidity(tokenId) > 0) {
                result[positionCount] = getPositionInfo(tokenId);
                positionCount++;
            }
        }
        return result;
    }

    function closePosition(uint256 tokenId, address recipient, address feeRecipient) onlyDiamond external {
        DecreaseLiquidityParams memory params = DecreaseLiquidityParams({
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

    function getPositionAmounts(uint256 tokenId) public view returns (uint256 amount0, uint256 amount1) {
        address poolId = getPool(tokenId);
        (int24 tickLower, int24 tickUpper) = getPositionTicks(tokenId);
        (uint160 sqrtRatioX96,,,,,,) = IPancakeV3Pool(poolId).slot0();
        (amount0, amount1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtRatioX96,
            TickMath.getSqrtRatioAtTick(tickLower),
            TickMath.getSqrtRatioAtTick(tickUpper),
            getLiquidity(tokenId)
        );
    }

    function getPositionTicks(uint256 tokenId) public view returns (int24 tickLower, int24 tickUpper) {
        (,,,,, tickLower, tickUpper,,,,,) = getNpm().positions(tokenId);
    }

    function getTokens(uint256 tokenId) public onlyDiamond view returns (address token0, address token1) {
        (,, token0, token1,,,,,,,,) = getNpm().positions(tokenId);
    }

    function getPool(uint256 tokenId) public onlyDiamond view returns (address poolId) {
        (address token0, address token1) = getTokens(tokenId);
        (,,,, uint24 fee,,,,,,,) = getNpm().positions(tokenId);
        IPancakeV3Factory factory = IPancakeV3Factory(getNpm().factory());
        poolId = factory.getPool(token0, token1, fee);
    }

    function isOwner(uint256 tokenId, address sender) external onlyDiamond view {
        require(getNpm().ownerOf(tokenId) == sender, "Caller doesn't own the token");
    }

    function isValidPosition(uint256 tokenId) external onlyDiamond view {
        require(tokenId != 0 && getNpm().ownerOf(tokenId) != address(0), "Invalid tokenId");
    }

    function isNotStakedPosition(uint256 tokenId) external onlyDiamond view {
        require(getNpm().ownerOf(tokenId) != LibCoreStorage.coreStorage().masterChefV3, "Position is staked");
    }

    function getNpm() internal view returns (INonfungiblePositionManager) {
        return INonfungiblePositionManager(LibCoreStorage.coreStorage().npm);
    }

    function getTickSpacing(uint256 tokenId) internal view returns (int24 tickSpacing) {
        IPancakeV3Pool pool = IPancakeV3Pool(getPool(tokenId));
        tickSpacing = pool.tickSpacing();
    }

    function getLiquidity(uint256 tokenId) internal view returns (uint128 liquidity) {
        (,,,,,,, liquidity,,,,) = getNpm().positions(tokenId);
    }

    function getFees(uint256 tokenId) internal view returns (uint256 fee0, uint256 fee1) {
        (fee0, fee1) = PositionValue.fees(getNpm(), tokenId);
    }

    function getReward(uint256 tokenId) internal view returns (uint256 reward) {
        IMasterChefV3 masterChef = IMasterChefV3(LibCoreStorage.coreStorage().masterChefV3);
        reward = masterChef.pendingCake(tokenId);
    }

    function getPositionInfo(uint256 tokenId) internal view returns (PositionInfo memory) {
        PositionInfo memory result;
        result.platform = "PCS";
        result.tokenId = tokenId;
        (result.token0, result.token1) = getTokens(tokenId);
        (result.tickLower, result.tickUpper) = getPositionTicks(tokenId);
        result.poolId = getPool(tokenId);
        IPancakeV3Pool pool = IPancakeV3Pool(result.poolId);
        (, result.currentTick,,,,,) = pool.slot0();
        (result.amount0, result.amount1) = getPositionAmounts(tokenId);
        (result.fee0, result.fee1) = getFees(tokenId);
        result.emissions = getReward(tokenId);

        return result;
    }

    function collectRewards(uint256 tokenId, address recipient) internal returns (uint256, uint256) {
        CollectParams memory collectParams = CollectParams({
            tokenId: tokenId,
            recipient: recipient,
            amount0Max: type(uint128).max,
            amount1Max: type(uint128).max
        });
        return getNpm().collect(collectParams);
    }

    function calculateChefPositionsLength(address wallet) internal view returns (uint256 length) {
        length = 0;
        IMasterChefV3 masterChef = IMasterChefV3(LibCoreStorage.coreStorage().masterChefV3);
        uint256 positionsLength = masterChef.balanceOf(wallet);
        for (uint256 i = 0; i < positionsLength; i++) {
            uint256 tokenId = masterChef.tokenOfOwnerByIndex(wallet, i);
            if (getLiquidity(tokenId) > 0) {
                length++;
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
