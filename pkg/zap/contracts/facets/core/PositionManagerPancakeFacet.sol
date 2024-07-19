//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@overnight-contracts/connectors/contracts/stuff/PancakeV3.sol";
import "../../libraries/core/LibCoreStorage.sol";
import "../../interfaces/Modifiers.sol";
import "../../interfaces/core/IPositionManagerFacet.sol";
import "../../interfaces/Constants.sol";
import "hardhat/console.sol";

contract PositionManagerPancakeFacet is IPositionManagerFacet, Modifiers {
    address constant private MASTER_CHEF_V3 = 0x5e09ACf80C0296740eC5d6F643005a4ef8DaA694;

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

    function getPositions(address wallet) external view returns (PositionInfo[] memory result) {
        uint256 validChefPositionsLength = calculateChefPositionsLength(wallet);
        uint256 validUserPositionsLength = calculateUserPositionsLength(wallet);
        uint256 userPositionsLength = getNpm().balanceOf(wallet);
        uint256 positionCount;
        result = new PositionInfo[](validChefPositionsLength + validUserPositionsLength);

        IMasterChefV3 masterChef = IMasterChefV3(MASTER_CHEF_V3);
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

    function getNpm() internal view returns (INonfungiblePositionManager) {
        return INonfungiblePositionManager(LibCoreStorage.coreStorage().npm);
    }

    function getTokens(uint256 tokenId) internal view returns (address token0, address token1) {
        (,, token0, token1,,,,,,,,) = getNpm().positions(tokenId);
    }

    function getTickSpacing(uint256 tokenId) internal view returns (int24 tickSpacing) {
        IPancakeV3Pool pool = IPancakeV3Pool(getPool(tokenId));
        tickSpacing = pool.tickSpacing();
    }

    function getTicks(uint256 tokenId) internal view returns (int24 tickLower, int24 tickUpper) {
        (,,,,, tickLower, tickUpper,,,,,) = getNpm().positions(tokenId);
    }

    function getLiquidity(uint256 tokenId) internal view returns (uint128 liquidity) {
        (,,,,,,, liquidity,,,,) = getNpm().positions(tokenId);
    }

    function getFees(uint256 tokenId) internal view returns (uint256 fee0, uint256 fee1) {
        (fee0, fee1) = PositionValue.fees(getNpm(), tokenId);
    }

    function getReward(uint256 tokenId) internal view returns (uint256 reward) {
        IMasterChefV3 masterChef = IMasterChefV3(MASTER_CHEF_V3);
        reward = masterChef.pendingCake(tokenId);
    }

    function getPool(uint256 tokenId) internal view returns (address poolId) {
        (address token0, address token1) = getTokens(tokenId);
        (,,,, uint24 fee,,,,,,,) = getNpm().positions(tokenId);
        IPancakeV3Factory factory = IPancakeV3Factory(getNpm().factory());
        poolId = factory.getPool(token0, token1, fee);
    }

    function _getPositionAmounts(uint256 tokenId) internal view returns (uint256 amount0, uint256 amount1) {
        address poolId = getPool(tokenId);
        (int24 tickLower, int24 tickUpper) = getTicks(tokenId);
        (uint160 sqrtRatioX96,,,,,,) = IPancakeV3Pool(poolId).slot0();
        (amount0, amount1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtRatioX96,
            TickMath.getSqrtRatioAtTick(tickLower),
            TickMath.getSqrtRatioAtTick(tickUpper),
            getLiquidity(tokenId)
        );
    }

    function getPositionInfo(uint256 tokenId) internal view returns (PositionInfo memory) {
        PositionInfo memory result;
        result.platform = "PCS";
        result.tokenId = tokenId;
        (result.token0, result.token1) = getTokens(tokenId);
        (result.tickLower, result.tickUpper) = getTicks(tokenId);
        result.poolId = getPool(tokenId);
        IPancakeV3Pool pool = IPancakeV3Pool(result.poolId);
        (, result.currentTick,,,,,) = pool.slot0();
        (result.amount0, result.amount1) = _getPositionAmounts(tokenId);
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
        IMasterChefV3 masterChef = IMasterChefV3(MASTER_CHEF_V3);
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
