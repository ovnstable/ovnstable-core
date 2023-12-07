// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./OdosZap.sol";

import "@overnight-contracts/connectors/contracts/stuff/Curve.sol";

contract ConvexZap3CurveFraxbp is OdosZap {
    uint256 constant POOL_TOKENS = type(uint256).max;

    struct ZapParams {
        address odosRouter;
    }

    struct AssetAmounts {
        uint256 bValue;
        uint256 aValue;
    }

    struct ConvexZap3InParams {
        uint256[] amountsOut;
        address curvePool;
        address fraxbpPool;
        address gauge;
        uint256 pid;
    }

    function setParams(ZapParams memory params) external onlyAdmin {
        require(params.odosRouter != address(0), "Zero address not allowed");
        odosRouter = params.odosRouter;
    }

    function _getAmountsOut(address[] memory tokensOut, ConvexZap3InParams memory curveData) internal returns (uint256[] memory) {
        uint256[] memory amountsOut = new uint256[](POOL_TOKENS);

        for (uint256 i = 0; i < tokensOut.length; i++) {
            IERC20 asset = IERC20(tokensOut[i]);

            if (curveData.amountsOut[i] > 0) {
                asset.transferFrom(msg.sender, address(this), curveData.amountsOut[i]);
            }
            amountsOut[i] = asset.balanceOf(address(this));
        }

        return amountsOut;
    }

    function _getMultSwapRatio(
        uint256[] memory tAmount,
        uint256[] memory reserves,
        uint256[] memory decimals
    ) internal pure returns (uint256 newAmount0, uint256 newAmount1, uint256 newAmount2) {
        uint256 total = 0;
        uint256[] memory tokenProportion = new uint256[](POOL_TOKENS);
        for (uint i = 0; i < reserves.length; i++) {
            total += reserves[i];
        }
        // Guard against division by zero
        if (total == 0) {
            return (0, 0, 0);
        }

        for (uint i = 0; i < reserves.length; i++) {
            uint percentage = ((reserves[i] * 100) / total) / 100;
            tokenProportion[i] = tAmount[i] * 10 ** decimals[i] * percentage;
        }

        return (tokenProportion[0], tokenProportion[1], tokenProportion[2]);
    }

    function _countProportions(
        address poolFinal,
        address fraxbp,
        address[] memory tOut,
        uint256[] memory amountsOut
    ) internal returns (uint256[] memory)  {
        uint256 usdpBalance = IStableSwapPool(poolFinal).balances(0);
        uint256 fraxBalance = IStableSwapPool(fraxbp).balances(0);
        uint256 usdcBalance = IStableSwapPool(fraxbp).balances(1);
        uint256[] memory decimalsArr = new uint256[](POOL_TOKENS);
        uint256[] memory tokenReserves = new uint256[](POOL_TOKENS);
        tokenReserves[0] = usdpBalance;
        tokenReserves[1] = fraxBalance;
        tokenReserves[2] = usdcBalance;

        for (uint i = 0; i < POOL_TOKENS; i++) {
            decimalsArr[i] = 10 ** IERC20Metadata(tOut[i]).decimals();
        }

        (uint256 tAmount0, uint256 tAmount1, uint256 tAmount2) = _getMultSwapRatio(
            amountsOut,
            tokenReserves,
            decimalsArr
        );

        uint256[] memory amountsAll = new uint256[](POOL_TOKENS);
        amountsAll[0] = tAmount0;
        amountsAll[1] = tAmount1;
        amountsAll[2] = tAmount2;

        return amountsAll;
    }

    function zapIn(SwapData memory swapData, ConvexZap3InParams memory curveData) external {
        _prepareSwap(swapData);
        _swap(swapData);

        IBooster gauge = IBooster(curveData.gauge);
        IRewardsOnlyGauge gaugeOnly = IRewardsOnlyGauge(curveData.gauge);
        IBooster.PoolInfo memory poolInfo = gauge.poolInfo(curveData.pid);
        IStableSwapPool pool = IStableSwapPool(poolInfo.lptoken);
        console.log('--------------------zapIn');
        address usdp = pool.coins(0);
        address fraxbp = pool.coins(1);

        IStableSwapPool fraxbpPool = IStableSwapPool(fraxbp);
        address frax = fraxbpPool.coins(0);
        address usdc = fraxbpPool.coins(1);

        address[] memory tokensOut = new address[](POOL_TOKENS);
        tokensOut[0] = usdp;
        tokensOut[1] = frax;
        tokensOut[2] = usdc;

        uint256[] memory amountsOut = _getAmountsOut(tokensOut, curveData);
        uint256[] memory amountsRatio = _countProportions(poolInfo.lptoken, fraxbp, tokensOut, amountsOut);
        console.log(amountsOut[0], '-----_getAmountsOut');
        _addLiquidity(pool, fraxbp, tokensOut, amountsRatio);
        _depositToGauge(pool, gaugeOnly);
    }

    function _addLiquidity(
        IStableSwapPool poolFinal,
        address fraxbp,
        address[] memory tOut,
        uint256[] memory tAmounts
    ) internal {
        IERC20[] memory assetArr = new IERC20[](POOL_TOKENS);

        for (uint256 i = 0; i < tAmounts.length; i++) {
            assetArr[i].approve(address(poolFinal), tAmounts[i]);
            assetArr[i] = IERC20(tOut[i]);
        }

        uint256 minAmount = poolFinal.calc_token_amount([tAmounts[0], tAmounts[1], tAmounts[0]], true);
        poolFinal.add_liquidity(
            [tAmounts[0], tAmounts[1], tAmounts[0]],
            OvnMath.subBasisPoints(minAmount, stakeSlippageBP),
            true
        );

        AssetAmounts[] memory assetAmounts = new AssetAmounts[](POOL_TOKENS);
        uint256[] memory amountsPut = new uint256[](POOL_TOKENS);
        uint256[] memory amountsReturned = new uint256[](POOL_TOKENS);

        for (uint256 i = 0; i < POOL_TOKENS; i++) {
            assetAmounts[i] = AssetAmounts(assetArr[i].balanceOf(address(this)), assetArr[i].balanceOf(address(this)));

            if (assetAmounts[i].aValue > 0) {
                assetArr[i].transfer(msg.sender, assetAmounts[i].aValue);
            }
        }

        for (uint256 i = 0; i < POOL_TOKENS; i++) {
            amountsPut[i] = assetAmounts[i].bValue - assetAmounts[i].aValue;
            amountsReturned[i] = assetAmounts[i].aValue;
        }

        emit PutIntoPool(amountsPut, tOut);
        emit ReturnedToUser(amountsReturned, tOut);
    }

    function _depositToGauge(IStableSwapPool pool, IRewardsOnlyGauge gauge) internal {
        uint256 poolBalance = pool.balanceOf(address(this));
        pool.approve(address(gauge), poolBalance);
        gauge.deposit(poolBalance, msg.sender);
    }
}
