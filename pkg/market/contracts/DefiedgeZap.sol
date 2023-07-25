// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./OdosZap.sol";

import "@overnight-contracts/connectors/contracts/stuff/DefiEdge.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";

contract DefiedgeZap is OdosZap {
    struct ZapParams {
        address odosRouter;
    }

    struct DefiedgeZapInParams {
        address gauge;
        uint256[] amountsOut;
    }

    struct ResultOfLiquidity {
        uint amountAsset0Before;
        uint amountAsset1Before;

        uint amountAsset0After;
        uint amountAsset1After;

        uint[] amountsPut;
        uint[] amountsReturned;
    }

    function setParams(ZapParams memory params) external onlyAdmin {
        require(params.odosRouter != address(0), "Zero address not allowed");
        odosRouter = params.odosRouter;
    }

    function zapIn(SwapData memory swapData, DefiedgeZapInParams memory defiedgeData) external {
        _prepareSwap(swapData);
        _swap(swapData);

        IDefiEdgeTwapStrategy strategy = IDefiEdgeTwapStrategy(defiedgeData.gauge);
        IUniswapV3Pool pool = IUniswapV3Pool(strategy.pool());
        address token0 = pool.token0();
        address token1 = pool.token1();

        address[] memory tokensOut = new address[](2);
        tokensOut[0] = token0;
        tokensOut[1] = token1;
        uint256[] memory amountsOut = new uint256[](2);

        for (uint256 i = 0; i < tokensOut.length; i++) {
            IERC20 asset = IERC20(tokensOut[i]);

            if (defiedgeData.amountsOut[i] > 0) {
                asset.transferFrom(msg.sender, address(this), defiedgeData.amountsOut[i]);
            }
            amountsOut[i] = asset.balanceOf(address(this));
        }

        _addLiquidity(pool, strategy, tokensOut, amountsOut);
    }

    function getProportion(
        address _gauge
    ) public view returns (uint256 token0Amount, uint256 token1Amount, uint256 denominator) {
        IDefiEdgeTwapStrategy strategy = IDefiEdgeTwapStrategy(_gauge);
        IUniswapV3Pool pool = IUniswapV3Pool(strategy.pool());
        address token0 = pool.token0();
        address token1 = pool.token1();

        uint256 dec0 = IERC20Metadata(token0).decimals();
        uint256 dec1 = IERC20Metadata(token1).decimals();

        // total liquidity = active(univ3pool balances) + unused(strategy balances)
        uint256 reserve0 = IERC20Metadata(token0).balanceOf(address(pool));
        uint256 reserve1 = IERC20Metadata(token1).balanceOf(address(pool));
        reserve0 += IERC20Metadata(token0).balanceOf(address(strategy));
        reserve1 += IERC20Metadata(token1).balanceOf(address(strategy));

        denominator = 10 ** (dec0 > dec1 ? dec0 : dec1);
        token0Amount = reserve0 * (denominator / (10 ** dec0));
        token1Amount = reserve1 * (denominator / (10 ** dec1));
    }

    function _addLiquidity(IUniswapV3Pool pool, IDefiEdgeTwapStrategy strategy, address[] memory tokensOut, uint256[] memory amountsOut) internal {
        // total liquidity = active(univ3pool balances) + unused(strategy balances)
        uint256 reserve0 = IERC20Metadata(tokensOut[0]).balanceOf(address(pool));
        uint256 reserve1 = IERC20Metadata(tokensOut[1]).balanceOf(address(pool));
        reserve0 += IERC20Metadata(tokensOut[0]).balanceOf(address(strategy));
        reserve1 += IERC20Metadata(tokensOut[1]).balanceOf(address(strategy));

        (uint256 tokensAmount0, uint256 tokensAmount1) = getAmountToSwap(
            amountsOut[0],
            amountsOut[1],
            reserve0,
            reserve1,
            10 ** IERC20Metadata(tokensOut[0]).decimals(),
            10 ** IERC20Metadata(tokensOut[1]).decimals()
        );

        IERC20 asset0 = IERC20(tokensOut[0]);
        IERC20 asset1 = IERC20(tokensOut[1]);
        asset0.approve(address(strategy), tokensAmount0);
        asset1.approve(address(strategy), tokensAmount1);

        ResultOfLiquidity memory result;
        result.amountAsset0Before = asset0.balanceOf(address(this));
        result.amountAsset1Before = asset1.balanceOf(address(this));

        strategy.mint(tokensAmount0, tokensAmount1, 0, 0, 0);

        result.amountAsset0After = asset0.balanceOf(address(this));
        result.amountAsset1After = asset1.balanceOf(address(this));

        if (result.amountAsset0After > 0) {
            asset0.transfer(msg.sender, result.amountAsset0After);
        }

        if (result.amountAsset1After > 0) {
            asset1.transfer(msg.sender, result.amountAsset1After);
        }

        result.amountsPut = new uint256[](2);
        result.amountsPut[0] = result.amountAsset0Before - result.amountAsset0After;
        result.amountsPut[1] = result.amountAsset1Before - result.amountAsset1After;

        result.amountsReturned = new uint256[](2);
        result.amountsReturned[0] = result.amountAsset0After;
        result.amountsReturned[1] = result.amountAsset1After;

        emit PutIntoPool(result.amountsPut, tokensOut);
        emit ReturnedToUser(result.amountsReturned, tokensOut);
    }

    function getAmountToSwap(
        uint256 amount0,
        uint256 amount1,
        uint256 reserve0,
        uint256 reserve1,
        uint256 denominator0,
        uint256 denominator1
    ) internal pure returns (uint256 newAmount0, uint256 newAmount1) {
        if ((reserve0 * 100) / denominator0 > (reserve1 * 100) / denominator1) {
            newAmount1 = (reserve1 * amount0) / reserve0;
            // 18 + 6 - 6
            newAmount1 = newAmount1 > amount1 ? amount1 : newAmount1;
            newAmount0 = (newAmount1 * reserve0) / reserve1;
            // 18 + 6 - 18
        } else {
            newAmount0 = (reserve0 * amount1) / reserve1;
            newAmount0 = newAmount0 > amount0 ? amount0 : newAmount0;
            newAmount1 = (newAmount0 * reserve1) / reserve0;
        }
    }

}
