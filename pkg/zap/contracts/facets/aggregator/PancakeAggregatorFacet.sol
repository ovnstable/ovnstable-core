//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@overnight-contracts/connectors/contracts/stuff/PancakeV3.sol";
import "../../libraries/core/LibCoreStorage.sol";
import "../../interfaces/IMasterFacet.sol";
import "../../interfaces/core/IAggregatorFacet.sol";
import "../../interfaces/Constants.sol";

contract PancakeAggregatorFacet is IAggregatorFacet {

    function protocolName() public pure returns (string memory) {
        return "Pancake";
    }

    function fetchPools(
        uint256 limit,
        uint256 offset
    ) external view returns (PoolInfo[] memory result) {
        IMasterFacet master = IMasterFacet(address(this));
        IMasterChefV3 masterChef = IMasterChefV3(LibCoreStorage.coreStorage().masterChefV3);
        uint256 poolsLength = masterChef.poolLength();
        uint256 size;
        if (offset < poolsLength) {
            size = offset + limit > poolsLength ? poolsLength - offset : limit;
        }
        result = new PoolInfo[](size);
        for (uint256 i = offset; i < offset + size; i++) {
            uint256 j = i - offset;
            IMasterChefV3.PoolInfo memory poolInfo = masterChef.poolInfo(i);
            if (address(poolInfo.v3Pool) == address(0)) {
                continue;
            }
            result[j].platform = protocolName();
            result[j].poolId = address(poolInfo.v3Pool);
            result[j].token0 = getTokenInfo(poolInfo.token0);
            result[j].token1 = getTokenInfo(poolInfo.token1);
            result[j].tickSpacing = master.getTickSpacing(address(poolInfo.v3Pool));
            result[j].fee = poolInfo.fee;
            result[j].gauge = LibCoreStorage.coreStorage().masterChefV3;

            (result[j].amount0, result[j].amount1) = getPoolAmounts(poolInfo.v3Pool);
            result[j].price = master.getCurrentPrice(result[j].poolId);
        }
    }

    function getPoolsAmount() external view returns (uint256) {
        return IMasterChefV3(LibCoreStorage.coreStorage().masterChefV3).poolLength();
    }

    function getTokenInfo(address tokenId) internal view returns (TokenInfo memory) {
        IERC20Metadata token = IERC20Metadata(tokenId);
        return TokenInfo({
            tokenId: tokenId,
            decimals: token.decimals(),
            name: token.name(),
            symbol: token.symbol()
        });
    }

    function getPoolAmounts(IPancakeV3Pool pool) internal view returns (uint256 amount0, uint256 amount1) {
        IERC20 token0 = IERC20(pool.token0());
        IERC20 token1 = IERC20(pool.token1());
        amount0 = token0.balanceOf(address(pool));
        amount1 = token1.balanceOf(address(pool));
    }

    function getNpm() internal view returns (INonfungiblePositionManager) {
        return INonfungiblePositionManager(LibCoreStorage.coreStorage().npm);
    }
}
