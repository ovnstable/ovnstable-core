// //SPDX-License-Identifier: MIT
// pragma solidity >=0.8.0;

// import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
// import "../../libraries/core/LibCoreStorage.sol";
// import "../../interfaces/IMasterFacet.sol";
// import "../../interfaces/core/IAggregatorFacet.sol";
// import "../../interfaces/Constants.sol";

// contract UniswapAggregatorFacet is IAggregatorFacet {

//     function protocolName() public pure returns (string memory) {
//         return "Uniswap";
//     }

//     function fetchPools(
//         uint256 limit,
//         uint256 offset
//     ) external view returns (PoolInfo[] memory result) {
//         IMasterFacet master = IMasterFacet(address(this));
//         IUniswapV3Factory factory = IUniswapV3Factory(master.getNpm().factory());
//         uint256 poolsLength = factory.allPoolsLength();
//         uint256 size;
//         if (offset < poolsLength) {
//             size = offset + limit > poolsLength ? poolsLength - offset : limit;
//         }
//         result = new PoolInfo[](size);
//         for (uint256 i = offset; i < offset + size; i++) {
//             uint256 j = i - offset;
//             IUniswapV3Pool pool = IUniswapV3Pool(factory.allPools(i));
//             result[j].platform = protocolName();
//             result[j].poolId = address(pool);
//             result[j].token0 = getTokenInfo(pool.token0());
//             result[j].token1 = getTokenInfo(pool.token1());
//             result[j].tickSpacing = pool.tickSpacing();
//             result[j].fee = pool.fee();
//             result[j].gauge = pool.gauge();

//             (result[j].amount0, result[j].amount1) = getPoolAmounts(pool);
//             result[j].price = master.getCurrentPrice(result[j].poolId);
//         }
//     }

//     function getPoolsAmount() external view returns (uint256) {
//         IMasterFacet master = IMasterFacet(address(this));
//         IUniswapV3Factory factory = IUniswapV3Factory(master.getNpm().factory());
//         return factory.allPoolsLength();
//     }

//     function getTokenInfo(address tokenId) internal view returns (TokenInfo memory) {
//         IERC20Metadata token = IERC20Metadata(tokenId);
//         return TokenInfo({
//             tokenId: tokenId,
//             decimals: token.decimals(),
//             name: token.name(),
//             symbol: token.symbol()
//         });
//     }

//     function getPoolAmounts(IUniswapV3Pool pool) internal view returns (uint256 amount0, uint256 amount1) {
//         IERC20 token0 = IERC20(pool.token0());
//         IERC20 token1 = IERC20(pool.token1());
//         amount0 = token0.balanceOf(address(pool));
//         amount1 = token1.balanceOf(address(pool));
//     }
// }
