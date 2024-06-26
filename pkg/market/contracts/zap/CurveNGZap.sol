// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./OdosZap.sol";

import "@overnight-contracts/connectors/contracts/stuff/Curve.sol";

contract CurveNGZap is OdosZap {

    struct ZapParams {
        address odosRouter;
    }

    struct CurveZapInParams {
        address gauge;
        uint256[] amountsOut;
    }

    function setParams(ZapParams memory params) external onlyAdmin {
        require(params.odosRouter != address(0), "Zero address not allowed");
        odosRouter = params.odosRouter;
    }

    function zapIn(SwapData memory swapData, CurveZapInParams memory curveData) external {
        _prepareSwap(swapData);
        _swap(swapData);

        IRewardsOnlyGauge gauge = IRewardsOnlyGauge(curveData.gauge);
        ICurveStableSwapNG pool = ICurveStableSwapNG(gauge.lp_token());        

        address[] memory tokensOut = new address[](2);
        tokensOut[0] = pool.coins(0);
        tokensOut[1] = pool.coins(1);
        uint256[] memory amountsOut = new uint256[](2);

        for (uint256 i = 0; i < tokensOut.length; i++) {
            IERC20 asset = IERC20(tokensOut[i]);

            if (curveData.amountsOut[i] > 0) {
                asset.transferFrom(msg.sender, address(this), curveData.amountsOut[i]);
            }
            amountsOut[i] = asset.balanceOf(address(this));
        }

        _addLiquidity(pool, tokensOut, amountsOut);
        _depositToGauge(pool, gauge);
    }

    function getProportion(
        address _gauge
    ) public view returns (uint256 token0Amount, uint256 token1Amount, uint256 denominator) {
        IRewardsOnlyGauge gauge = IRewardsOnlyGauge(_gauge);
        IStableSwapPool pool = IStableSwapPool(gauge.lp_token());
        uint256 dec0 = IERC20Metadata(pool.coins(0)).decimals();
        uint256 dec1 = IERC20Metadata(pool.coins(1)).decimals();
        denominator = 10 ** (dec0 > dec1 ? dec0 : dec1);
        token0Amount = pool.balances(0) * (denominator / (10 ** dec0));
        token1Amount = pool.balances(1) * (denominator / (10 ** dec1));
    }

    function _addLiquidity(ICurveStableSwapNG pool, address[] memory tokensOut, uint256[] memory amountsOut) internal {
        (uint256 tokensAmount0, uint256 tokensAmount1) = _getAmountToSwap(
            amountsOut[0],
            amountsOut[1],
            pool.balances(0),
            pool.balances(1),
            10 ** IERC20Metadata(tokensOut[0]).decimals(),
            10 ** IERC20Metadata(tokensOut[1]).decimals()
        );

        IERC20 asset0 = IERC20(tokensOut[0]);
        IERC20 asset1 = IERC20(tokensOut[1]);
        asset0.approve(address(pool), tokensAmount0);
        asset1.approve(address(pool), tokensAmount1);

        uint256 amountAsset0Before = asset0.balanceOf(address(this));
        uint256 amountAsset1Before = asset1.balanceOf(address(this));

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = tokensAmount0;
        amounts[1] = tokensAmount1;

        pool.add_liquidity(
            amounts,
            OvnMath.subBasisPoints(pool.calc_token_amount(amounts, true), stakeSlippageBP),
            msg.sender
        );

        uint256 amountAsset0After = asset0.balanceOf(address(this));
        uint256 amountAsset1After = asset1.balanceOf(address(this));

        if (amountAsset0After > 0) {
            asset0.transfer(msg.sender, amountAsset0After);
        }

        if (amountAsset1After > 0) {
            asset1.transfer(msg.sender, amountAsset1After);
        }

        uint256[] memory amountsPut = new uint256[](2);
        amountsPut[0] = amountAsset0Before - amountAsset0After;
        amountsPut[1] = amountAsset1Before - amountAsset1After;

        uint256[] memory amountsReturned = new uint256[](2);
        amountsReturned[0] = amountAsset0After;
        amountsReturned[1] = amountAsset1After;
        emit PutIntoPool(amountsPut, tokensOut);
        emit ReturnedToUser(amountsReturned, tokensOut);
    }

    function _depositToGauge(ICurveStableSwapNG pool, IRewardsOnlyGauge gauge) internal {
        uint256 poolBalance = pool.balanceOf(address(this));
        pool.approve(address(gauge), poolBalance);
        gauge.deposit(poolBalance, msg.sender);
    }
}
