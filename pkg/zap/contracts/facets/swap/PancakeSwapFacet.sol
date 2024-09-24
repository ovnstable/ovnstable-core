//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@overnight-contracts/connectors/contracts/stuff/PancakeV3.sol";
import "../../libraries/core/LibCoreStorage.sol";
import "../../interfaces/Modifiers.sol";
import "../../interfaces/core/ISwapFacet.sol";
import "../../interfaces/IMasterFacet.sol";
import "../../interfaces/Constants.sol";

contract PancakeSwapFacet is ISwapFacet, Modifiers {

    struct SwapCallbackData {
        address tokenA;
        address tokenB;
        uint24 fee;
    }

    function swap(
        address pair,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96,
        bool zeroForOne
    ) public onlyDiamond amountIsNotZero(amountIn) {
        IPancakeV3Pool pool = IPancakeV3Pool(pair);
        SwapCallbackData memory data = SwapCallbackData({
            tokenA: pool.token0(),
            tokenB: pool.token1(),
            fee: pool.fee()
        });

        pool.swap(
            address(this), 
            zeroForOne, 
            int256(amountIn), 
            sqrtPriceLimitX96 == 0
                ? (zeroForOne ? TickMath.MIN_SQRT_RATIO + 1 : TickMath.MAX_SQRT_RATIO - 1)
                : sqrtPriceLimitX96, 
            abi.encode(data)
        );
    }

    function simulateSwap(
        address pair,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96,
        bool zeroForOne,
        int24[] memory tickRange
    ) external onlyDiamond amountIsNotZero(amountIn) {
        IMasterFacet master = IMasterFacet(address(this));
        (address token0Address, address token1Address) = master.getPoolTokens(pair);
        swap(pair, amountIn, sqrtPriceLimitX96, zeroForOne);

        uint256[] memory ratio = new uint256[](2);
        (ratio[0], ratio[1]) = master.getProportion(pair, tickRange);
        revert SwapError(
            IERC20(token0Address).balanceOf(address(this)),
            IERC20(token1Address).balanceOf(address(this)),
            ratio[0],
            ratio[1]
        );
    }

    function pancakeV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata _data
    ) external {
        SwapCallbackData memory data = abi.decode(_data, (SwapCallbackData));
        address factory = INonfungiblePositionManager(LibCoreStorage.coreStorage().npm).factory();
        CallbackValidation.verifyCallback(factory, data.tokenA, data.tokenB, data.fee);

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

    modifier amountIsNotZero(uint256 amount) {
        require(amount > 0, "Amount to swap is zero");
        _;
    }
}
