////SPDX-License-Identifier: MIT
//pragma solidity >=0.8.0;
//
//import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
//import "@overnight-contracts/connectors/contracts/stuff/PancakeV3.sol";
//import "../../libraries/core/LibCoreStorage.sol";
//import "../../interfaces/Modifiers.sol";
//import "../../interfaces/core/IPositionManagerFacet.sol";
//
//contract PoolMathPancakeFacet is IPositionManagerFacet, Modifiers {
//    function mintPosition(
//        address pair,
//        int24 tickRange0,
//        int24 tickRange1,
//        uint256 amountOut0,
//        uint256 amountOut1
//    ) external onlyDiamond returns (uint256 tokenId) {
//        INonfungiblePositionManager manager = INonfungiblePositionManager(LibCoreStorage.coreStorage().npm);
//        IPancakeV3Pool pool = IPancakeV3Pool(pair);
//        address token0 = pool.token0();
//        address token1 = pool.token1();
//        (tokenId,,,) = manager.mint(MintParams(token0, token1, pool.fee(), tickRange0, tickRange1,
//            amountOut0, amountOut1, 0, 0, msg.sender, block.timestamp));
//    }
//}
