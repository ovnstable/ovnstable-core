//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";
import "../../libraries/core/LibCoreStorage.sol";
import "../../interfaces/Modifiers.sol";
import "../../interfaces/core/ISwapFacet.sol";
import "../../interfaces/IMasterFacet.sol";
import "../../interfaces/Constants.sol";

contract SwapAerodromeFacet is ISwapFacet, Modifiers {
    address constant WETH = 0x4200000000000000000000000000000000000006;
    
    function swap(
        address pair,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96,
        bool zeroForOne
    ) external onlyDiamond {
        IMasterFacet master = IMasterFacet(address(this));
        (address token0Address, address token1Address) = master.getPoolTokens(pair);
        int24 tickSpacing = master.getTickSpacing(pair);
        SwapCallbackData memory data = SwapCallbackData({
            tokenA: token0Address,
            tokenB: token1Address,
            tickSpacing: tickSpacing
        });

        ICLPool(pair).swap(
            address(this), 
            zeroForOne, 
            int256(amountIn), 
            sqrtPriceLimitX96 == 0
                ? (zeroForOne ? TickMath.MIN_SQRT_RATIO + 1 : TickMath.MAX_SQRT_RATIO - 1)
                : sqrtPriceLimitX96, 
            abi.encode(data)
        );
    }

    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata _data
    ) external {
        SwapCallbackData memory data = abi.decode(_data, (SwapCallbackData));
        address factory = INonfungiblePositionManager(LibCoreStorage.coreStorage().npm).factory();
        CallbackValidation.verifyCallback(factory, data.tokenA, data.tokenB, data.tickSpacing);

        (bool isExactInput, uint256 amountToPay) =
            amount0Delta > 0
                ? (data.tokenA < data.tokenB, uint256(amount0Delta))
                : (data.tokenB < data.tokenA, uint256(amount1Delta));

        if (isExactInput) {
            IERC20(data.tokenA).transfer(msg.sender, amountToPay);
        } else {
            IERC20(data.tokenB).transfer(msg.sender, amountToPay);
        }

    }
}
