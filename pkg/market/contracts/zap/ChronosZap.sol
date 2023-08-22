// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@overnight-contracts/connectors/contracts/stuff/Chronos.sol";
import "./OdosZap.sol";

contract ChronosZap is OdosZap {
    IChronosRouter public chronosRouter;

    struct ZapParams {
        address chronosRouter;
        address odosRouter;
    }

    struct ChronosZapInParams {
        address gauge;
        uint256[] amountsOut;
    }

    function setParams(ZapParams memory params) external onlyAdmin {
        require(params.chronosRouter != address(0), "Zero address not allowed");
        require(params.odosRouter != address(0), "Zero address not allowed");

        chronosRouter = IChronosRouter(params.chronosRouter);
        odosRouter = params.odosRouter;
    }

    function zapIn(SwapData memory swapData, ChronosZapInParams memory chronosData) external {
        _prepareSwap(swapData);
        _swap(swapData);

        IChronosGauge gauge = IChronosGauge(chronosData.gauge);
        IERC20 _token = gauge.TOKEN();
        IChronosPair pair = IChronosPair(address(_token));
        address maNFTs = gauge.maNFTs();
        (address token0, address token1) = pair.tokens();

        address[] memory tokensOut = new address[](2);
        tokensOut[0] = token0;
        tokensOut[1] = token1;
        uint256[] memory amountsOut = new uint256[](2);

        for (uint256 i = 0; i < tokensOut.length; i++) {
            IERC20 asset = IERC20(tokensOut[i]);

            if (chronosData.amountsOut[i] > 0) {
                asset.transferFrom(msg.sender, address(this), chronosData.amountsOut[i]);
            }
            amountsOut[i] = asset.balanceOf(address(this));
        }

        _addLiquidity(pair, tokensOut, amountsOut);
        _stakeToGauge(pair, gauge, IChronosNFT(maNFTs));
    }

    function getProportion(
        address _gauge
    ) public view returns (uint256 token0Amount, uint256 token1Amount, uint256 denominator) {
        IChronosGauge gauge = IChronosGauge(_gauge);
        IERC20 _token = gauge.TOKEN();
        IChronosPair pair = IChronosPair(address(_token));
        (uint256 reserve0, uint256 reserve1, ) = pair.getReserves();
        (address token0, address token1) = pair.tokens();
        uint256 dec0 = IERC20Metadata(token0).decimals();
        uint256 dec1 = IERC20Metadata(token1).decimals();
        denominator = 10 ** (dec0 > dec1 ? dec0 : dec1);
        token0Amount = reserve0 * (denominator / (10 ** dec0));
        token1Amount = reserve1 * (denominator / (10 ** dec1));
    }

    function _addLiquidity(
        IChronosPair pair,
        address[] memory tokensOut,
        uint256[] memory amountsOut
    ) internal {
        (uint256 reserve0, uint256 reserve1, ) = pair.getReserves();
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
        asset0.approve(address(chronosRouter), tokensAmount0);
        asset1.approve(address(chronosRouter), tokensAmount1);

        uint256 amountAsset0Before = asset0.balanceOf(address(this));
        uint256 amountAsset1Before = asset1.balanceOf(address(this));

        chronosRouter.addLiquidity(
            tokensOut[0],
            tokensOut[1],
            pair.stable(),
            tokensAmount0,
            tokensAmount1,
            OvnMath.subBasisPoints(tokensAmount0, stakeSlippageBP),
            OvnMath.subBasisPoints(tokensAmount1, stakeSlippageBP),
            address(this),
            block.timestamp
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

    function _stakeToGauge(IChronosPair pair, IChronosGauge gauge, IChronosNFT token) internal {
        uint256 pairBalance = pair.balanceOf(address(this));
        pair.approve(address(gauge), pairBalance);
        uint256 tokenIdNew = gauge.deposit(pairBalance);
        token.safeTransferFrom(address(this), address(msg.sender), tokenIdNew);
    }
}
