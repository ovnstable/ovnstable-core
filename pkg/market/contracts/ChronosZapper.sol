// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./OdosWrapper.sol";

contract ChronosZapper is OdosWrapper {
    IChronosRouter public chronosRouter;

    function setRouters(address _chronosRouter, address _odosRouter) external onlyAdmin {
        require(_chronosRouter != address(0), "Zero address not allowed");
        require(_odosRouter != address(0), "Zero address not allowed");
        chronosRouter = IChronosRouter(_chronosRouter);
        odosRouter = _odosRouter;
    }

    function zapIn(SwapData memory swapData, address _gauge) external {
        for (uint256 i = 0; i < swapData.outputs.length; i++) {
            for (uint256 j = 0; j < i; j++) {
                require(
                    swapData.outputs[i].tokenAddress != swapData.outputs[j].tokenAddress,
                    "Duplicate output tokens"
                );
                require(
                    swapData.outputs[i].receiver == address(this),
                    "Receiver of swap is not this contract"
                );
            }
        }

        for (uint256 i = 0; i < swapData.inputs.length; i++) {
            // different inputs
            for (uint256 j = 0; j < i; j++) {
                require(
                    swapData.inputs[i].tokenAddress != swapData.inputs[j].tokenAddress,
                    "Duplicate input tokens"
                );
            }
            // no identical inputs and outputs
            for (uint256 j = 0; j < swapData.outputs.length; j++) {
                require(
                    swapData.inputs[i].tokenAddress != swapData.outputs[j].tokenAddress,
                    "Duplicate input and output"
                );
            }

            IERC20 asset = IERC20(swapData.inputs[i].tokenAddress);
            asset.transferFrom(msg.sender, address(this), swapData.inputs[i].amountIn);
            asset.approve(odosRouter, swapData.inputs[i].amountIn);
        }

        (address[] memory tokensOut, uint256[] memory amountsOut) = _swap(swapData);

        IChronosGauge gauge = IChronosGauge(_gauge);
        IERC20 _token = gauge.TOKEN();
        IChronosPair pair = IChronosPair(address(_token));
        address maNFTs = gauge.maNFTs();
        IChronosNFT token = IChronosNFT(maNFTs);
        _addLiquidity(pair, tokensOut, amountsOut);
        _stakeToGauge(pair, gauge, token);
    }

    function getProportion(
        address _gauge
    ) view public returns (uint256 token0Amount, uint256 token1Amount, uint256 denominator) {
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
        (uint256 tokensAmount0, uint256 tokensAmount1) = getAmountToSwap(
            amountsOut[0],
            amountsOut[1],
            reserve0,
            reserve1,
            IERC20Metadata(tokensOut[0]).decimals(),
            IERC20Metadata(tokensOut[1]).decimals()
        );
        IERC20 asset0 = IERC20(tokensOut[0]);
        asset0.transferFrom(address(this), address(msg.sender), amountsOut[0] - tokensAmount0);
        IERC20 asset1 = IERC20(tokensOut[1]);
        asset1.transferFrom(address(this), address(msg.sender), amountsOut[1] - tokensAmount1);

        asset0.approve(address(chronosRouter), tokensAmount0);
        asset1.approve(address(chronosRouter), tokensAmount1);

        chronosRouter.addLiquidity(
            tokensOut[0],
            tokensOut[1],
            true,
            tokensAmount0,
            tokensAmount1,
            OvnMath.subBasisPoints(tokensAmount0, stakeSlippageBP),
            OvnMath.subBasisPoints(tokensAmount1, stakeSlippageBP),
            address(this),
            block.timestamp
        );
        uint256[] memory amountsPut = new uint256[](2);
        amountsPut[0] = tokensAmount0;
        amountsPut[1] = tokensAmount1;

        uint256[] memory amountsReturned = new uint256[](2);
        amountsReturned[0] = amountsOut[0] - tokensAmount0;
        amountsReturned[1] = amountsOut[1] - tokensAmount1;
        emit PutIntoPool(amountsPut, tokensOut);
        emit ReturnedToUser(amountsReturned, tokensOut);
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
            newAmount1 = (reserve1 * amount0) / reserve0; // 18 +6 - 6
            newAmount1 = newAmount1 > amount1 ? amount1 : newAmount1;
            newAmount0 = (newAmount1 * reserve0) / reserve1; // 18 + 6 - 18
        } else {
            newAmount0 = (reserve0 * amount1) / reserve1;
            newAmount0 = newAmount0 > amount0 ? amount0 : newAmount0;
            newAmount1 = (newAmount0 * reserve1) / reserve0;
        }
    }

    function _stakeToGauge(
        IChronosPair pair,
        IChronosGauge gauge,
        IChronosNFT token
    ) internal {
        
        uint256 pairBalance = pair.balanceOf(address(this));
        pair.approve(address(gauge), pairBalance);
        uint256 tokenIdNew = gauge.deposit(pairBalance);
        token.safeTransferFrom(address(this), address(msg.sender), tokenIdNew);
    }
}
