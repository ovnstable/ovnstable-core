// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./OdosZap.sol";

import "@overnight-contracts/connectors/contracts/stuff/Curve.sol";

contract ConvexZap3CurveFraxbp is OdosZap {

//    struct ZapParams {
//        address odosRouter;
//    }
//
//    struct ConvexZap3InParams {
//        uint256[] amountsOut;
//        address curvePool;
//        address fraxbpPool;
//        address gauge;
//        uint256 pid;
//    }
//
//    function setParams(ZapParams memory params) external onlyAdmin {
//        require(params.odosRouter != address(0), "Zero address not allowed");
//        odosRouter = params.odosRouter;
//    }
//
//    function zapIn(SwapData memory swapData, ConvexZap3InParams memory curveData) external {
//        _prepareSwap(swapData);
//        _swap(swapData);
//
//        IBooster gauge = IBooster(curveData.gauge);
//        IBooster.PoolInfo poolInfo = gauge.poolInfo(curveData.pid);
//        IStableSwapPool pool = IStableSwapPool(poolInfo.lptoken);
//        address usdp = pool.coins(0);
//        address fraxbp = pool.coins(1);
//
//        IStableSwapPool fraxbpPool = IStableSwapPool(fraxbp);
//        address frax = fraxbpPool.coins(0);
//        address usdc = fraxbpPool.coins(1);
//
//        address[] memory tokensOut = new address[](3);
//        tokensOut[0] = usdp;
//        tokensOut[1] = frax;
//        tokensOut[2] = usdc;
//        uint256[] memory amountsOut = new uint256[](3);
//
//        for (uint256 i = 0; i < tokensOut.length; i++) {
//            IERC20 asset = IERC20(tokensOut[i]);
//
//            if (curveData.amountsOut[i] > 0) {
//                asset.transferFrom(msg.sender, address(this), curveData.amountsOut[i]);
//            }
//            amountsOut[i] = asset.balanceOf(address(this));
//        }
//
//        _addLiquidity(pool, tokensOut, amountsOut);
//        _depositToGauge(pool, gauge);
//    }
//
//    function getProportion(
//        address _gauge
//    ) public view returns (uint256 token0Amount, uint256 token1Amount, uint256 denominator) {
//        IBooster gauge = IBooster(_gauge);
//        address _token = gauge.lp_token();
//        IStableSwapPool pool = IStableSwapPool(_token);
//        // (uint256 reserve0, uint256 reserve1, ) = pool.getReserves();
//        uint256 reserve0 = pool.balances(0);
//        uint256 reserve1 = pool.balances(1);
//        address token0 = pool.coins(0);
//        address token1 = pool.coins(1);
//        uint256 dec0 = IERC20Metadata(token0).decimals();
//        uint256 dec1 = IERC20Metadata(token1).decimals();
//        denominator = 10 ** (dec0 > dec1 ? dec0 : dec1);
//        token0Amount = reserve0 * (denominator / (10 ** dec0));
//        token1Amount = reserve1 * (denominator / (10 ** dec1));
//    }
//
//    function _addLiquidity(IStableSwapPool finalPool, IStableSwapPool fraxbp, address[] memory tokensOut, uint256[] memory amountsOut, address curvePool) internal {
//        uint256 usdpBalance = finalPool.balances(0);
//        uint256 fraxbpBalance = finalPool.balances(1);
//        uint256 fraxbpTotalSupply = fraxbp.totalSupply();
//        uint256 fraxBalance = fraxbp.balances(0);
//        uint256 usdcBalance = fraxbp.balances(1);
//
//        (uint256 tokensAmount0, uint256 tokensAmount1) = _getAmountToSwap(
//            amountsOut[0],
//            amountsOut[1],
//            reserve0,
//            reserve1,
//            10 ** IERC20Metadata(tokensOut[0]).decimals(),
//            10 ** IERC20Metadata(tokensOut[1]).decimals()
//        );
//
//        IERC20 asset0 = IERC20(tokensOut[0]);
//        IERC20 asset1 = IERC20(tokensOut[1]);
//        IERC20 asset2 = IERC20(tokensOut[2]);
//        asset0.approve(address(pool), tokensAmount0);
//        asset1.approve(address(pool), tokensAmount1);
//
//        uint256 amountAsset0Before = asset0.balanceOf(address(this));
//        uint256 amountAsset1Before = asset1.balanceOf(address(this));
//
//        pool.add_liquidity(
//            [tokensAmount0, tokensAmount1,tokensAmount2],
//            OvnMath.subBasisPoints(pool.calc_token_amount([tokensAmount0, tokensAmount1], true), stakeSlippageBP)
//        );
//
//        uint256 amountAsset0After = asset0.balanceOf(address(this));
//        uint256 amountAsset1After = asset1.balanceOf(address(this));
//
//        if (amountAsset0After > 0) {
//            asset0.transfer(msg.sender, amountAsset0After);
//        }
//
//        if (amountAsset1After > 0) {
//            asset1.transfer(msg.sender, amountAsset1After);
//        }
//
//        uint256[] memory amountsPut = new uint256[](2);
//        amountsPut[0] = amountAsset0Before - amountAsset0After;
//        amountsPut[1] = amountAsset1Before - amountAsset1After;
//
//        uint256[] memory amountsReturned = new uint256[](2);
//        amountsReturned[0] = amountAsset0After;
//        amountsReturned[1] = amountAsset1After;
//        emit PutIntoPool(amountsPut, tokensOut);
//        emit ReturnedToUser(amountsReturned, tokensOut);
//    }
//
//    function _depositToGauge(IStableSwapPool pool, IBooster gauge) internal {
//        uint256 poolBalance = pool.balanceOf(address(this));
//        pool.approve(address(gauge), poolBalance);
//        gauge.deposit(poolBalance, msg.sender);
//    }
}
