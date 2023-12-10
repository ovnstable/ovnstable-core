// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./OdosZap.sol";

import "@overnight-contracts/connectors/contracts/stuff/Curve.sol";

contract ConvexZap3 is OdosZap {

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

    function getProportion(
        address _gauge
    ) public view returns (uint256 token0Amount, uint256 token1Amount) {
        IRewardsOnlyGauge gauge = IRewardsOnlyGauge(_gauge);
        address _token = gauge.lp_token();
        IStableSwapPool pool = IStableSwapPool(_token);
        // (uint256 reserve0, uint256 reserve1, ) = pool.getReserves();
        uint256 usdPlusAm = pool.balances(0);
        uint256 fraxBpAm = pool.balances(1);
        address usdPlusAdd = pool.coins(0);
        address fraxBp = pool.coins(1);

        token0Amount = usdPlusAm / (10 **  IERC20Metadata(usdPlusAdd).decimals());
        token1Amount = fraxBpAm / (10 ** IERC20Metadata(fraxBp).decimals());
    }

    function zapIn(SwapData memory swapData, CurveZapInParams memory curveData) external {
        _prepareSwap(swapData);
        _swap(swapData);

        IRewardsOnlyGauge gauge = IRewardsOnlyGauge(curveData.gauge);
        address _token = gauge.lp_token();
        IStableSwapPool pool = IStableSwapPool(_token);
        address token0 = pool.coins(0);
        address token1 = pool.coins(1);

        address[] memory tokensOut = new address[](2);
        tokensOut[0] = token0;
        tokensOut[1] = token1;
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

    function _addLiquidity(IStableSwapPool pool, address[] memory tokensOut, uint256[] memory amountsOut) internal {
        uint256 reserve0 = pool.balances(0);
        uint256 reserve1 = pool.balances(1);
        (uint256 tokensAmount0, uint256 tokensAmount1) = _getAmountToSwap(
            amountsOut[0],
            amountsOut[1],
            reserve0,
            reserve1,
            10 ** IERC20Metadata(tokensOut[0]).decimals(),
            10 ** IERC20Metadata(tokensOut[1]).decimals()
        );

        IERC20 asset0 = IERC20(tokensOut[0]);
        IERC20 asset1 = IERC20(tokensOut[1]);
        asset0.approve(address(pool), tokensAmount0);
        asset1.approve(address(pool), tokensAmount1);

        uint256 amountAsset0Before = asset0.balanceOf(address(this));
        uint256 amountAsset1Before = asset1.balanceOf(address(this));

        pool.add_liquidity(
            [tokensAmount0, tokensAmount1],
            OvnMath.subBasisPoints(pool.calc_token_amount([tokensAmount0, tokensAmount1], true), stakeSlippageBP)
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

    function _depositToGauge(IStableSwapPool pool, IRewardsOnlyGauge gauge) internal {
        uint256 poolBalance = pool.balanceOf(address(this));
        pool.approve(address(gauge), poolBalance);
        gauge.deposit(poolBalance, msg.sender);
    }
}
