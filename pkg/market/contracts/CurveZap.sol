// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./OdosZap.sol";
import "@overnight-contracts/connectors/contracts/stuff/Curve.sol";

import "hardhat/console.sol";

contract CurveZap is OdosZap {
    struct ZapParams {
        address odosRouter;
    }

    struct CurveZapInParams {
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

    function zapIn(SwapData memory swapData, CurveZapInParams memory curveData) external {
        _prepareSwap(swapData);
        _swap(swapData);

        IRewardsOnlyGauge gauge = IRewardsOnlyGauge(curveData.gauge);
        IStableSwapPool pool = IStableSwapPool(gauge.lp_token());

        address[] memory tokensOut = new address[](2);
        tokensOut[0] = pool.coins(0);
        tokensOut[1] = pool.coins(1);
        uint256[] memory amountsOut = new uint256[](2);

        for (uint256 i = 0; i < tokensOut.length; i++) {
            IERC20 asset = IERC20(tokensOut[i]);

            if (curveData.amountsOut[i] > 0) {
                console.log("Transfering %s => from %s to %s", tokensOut[i], msg.sender, address(this));
                console.log("Amount: %s", curveData.amountsOut[i]);
                asset.transferFrom(msg.sender, address(this), curveData.amountsOut[i]);
            }
            amountsOut[i] = asset.balanceOf(address(this));
        }

        _addLiquidity(pool, gauge, tokensOut, amountsOut);
    }

    function getProportion(
        address _gauge
    ) public view returns (uint256 token0Amount, uint256 token1Amount, uint256 denominator) {
        IRewardsOnlyGauge gauge = IRewardsOnlyGauge(_gauge);
        IStableSwapPool pool = IStableSwapPool(gauge.lp_token());

        IERC20Metadata token0 = IERC20Metadata(pool.coins(0));
        IERC20Metadata token1 = IERC20Metadata(pool.coins(1));

        uint256 dec0 = token0.decimals();
        uint256 dec1 = token1.decimals();

        uint256 reserve0 = pool.balances(0);
        uint256 reserve1 = pool.balances(1);

        denominator = 10 ** (dec0 > dec1 ? dec0 : dec1);
        token0Amount = reserve0 * (denominator / (10 ** dec0));
        token1Amount = reserve1 * (denominator / (10 ** dec1));
    }

    function _addLiquidity(IStableSwapPool pool, IRewardsOnlyGauge gauge, address[] memory tokensOut, uint256[] memory amountsOut) internal {
        uint256 reserve0 = pool.balances(0);
        uint256 reserve1 = pool.balances(1);
        console.log("_addLiquidity Reserve0: %s", reserve0);
        console.log("_addLiquidity Reserve1: %s", reserve1);

        // todo: check this method:
        (uint256 tokensAmount0, uint256 tokensAmount1) = getAmountToSwap(
            amountsOut[0],
            amountsOut[1],
            reserve0,
            reserve1,
            10 ** IERC20Metadata(tokensOut[0]).decimals(),
            10 ** IERC20Metadata(tokensOut[1]).decimals()
        );

//        tokensAmount0 = 350000000;
        console.log("tokensAmount0: out %s | res %s", amountsOut[0], tokensAmount0);
        console.log("tokensAmount1: out %s | res %s", amountsOut[1], tokensAmount1);

        console.log("token0: %s | %s", tokensOut[0]); // usd+
        console.log("token1: %s | %s", tokensOut[1]); // fraxbp
        IERC20 asset0 = IERC20(tokensOut[0]);
        IERC20 asset1 = IERC20(tokensOut[1]);
        asset0.approve(address(pool), tokensAmount0);
        asset1.approve(address(pool), tokensAmount1);

        ResultOfLiquidity memory result;
        result.amountAsset0Before = asset0.balanceOf(address(this));
        console.log("Asset0 before: %s", result.amountAsset0Before);
        result.amountAsset1Before = asset1.balanceOf(address(this));
        console.log("Asset1 before: %s", result.amountAsset1Before);

        uint256[2] memory amounts;
        amounts[0] = tokensAmount0;
        amounts[1] = tokensAmount1;
        uint256 lpTokAmount = pool.calc_token_amount(amounts, true);
        console.log("LPTokens to mint: %s", lpTokAmount);

        // slippage
        uint256 stakedCount = pool.add_liquidity(amounts, lpTokAmount * 99 / 100);
//        uint256 stakedCount = pool.add_liquidity([0, tokensAmount1], 0);
        console.log("Staked count: %s", stakedCount);

        result.amountAsset0After = asset0.balanceOf(address(this));
        result.amountAsset1After = asset1.balanceOf(address(this));
        console.log("Asset0 after: %s", result.amountAsset0After);
        console.log("Asset1 after: %s", result.amountAsset1After);

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

    function _depositToGauge(IStableSwapPool pool, IRewardsOnlyGauge gauge) internal {
        uint256 poolBalance = pool.balanceOf(address(this));
        console.log("Pool balance: %s", poolBalance);
        pool.approve(address(gauge), poolBalance);
        gauge.deposit(poolBalance, msg.sender);
    }

}
