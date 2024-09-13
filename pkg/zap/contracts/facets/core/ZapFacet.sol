//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "../../interfaces/IMasterFacet.sol";
import "../../libraries/core/LibCoreStorage.sol";

contract ZapFacet is IZapFacet {
    event InputTokens(address[] tokens, uint256[] amounts);
    event OutputTokens(address[] tokens, uint256[] amounts);
    event InitialTokens(address[] tokens, uint256[] amounts);
    event PutIntoPool(address[] tokens, uint256[] amounts);
    event SwapedIntoPool(address[] tokens, uint256[] amounts);
    event ReturnedToUser(address[] tokens, uint256[] amounts);
    event PoolPriceInitial(uint256 price);
    event PoolPriceAfterOdosSwap(uint256 price);
    event PoolPriceAfterSwap(uint256 price);
    event TokenId(uint256 tokenId); // name..?

    error BelowAmountMin(address tokenAddress, uint256 amountMin, uint256 amountReceived);

    receive() external payable {}

    function zapIn(SwapData memory swapData, ZapInParams memory paramsData) external {
        _zapIn(swapData, paramsData, true, 0);
    }

    function zapOut(uint256 tokenId) external {
        _zapOut(tokenId, msg.sender, msg.sender);
    }

    function rebalance(SwapData memory swapData, ZapInParams memory paramsData, uint256 tokenId) external {
        _zapOut(tokenId, address(this), msg.sender);
        _zapIn(swapData, paramsData, false, 0);
    }

    function increase(SwapData memory swapData, ZapInParams memory paramsData, uint256 tokenId) external {
        _zapIn(swapData, paramsData, true, tokenId);
    }

    function merge(
        SwapData memory swapData, 
        ZapInParams memory paramsData, 
        uint256 tokenIn, 
        uint256[] memory tokensOut
    ) external {
        for (uint256 i = 0; i < tokensOut.length; i++) {
            _zapOut(tokensOut[i], address(this), msg.sender);
        }
        _zapIn(swapData, paramsData, false, tokenIn);
    }

    function _zapIn(
        SwapData memory swapData,
        ZapInParams memory paramsData,
        bool needTransfer,
        uint256 tokenId
    ) internal {
        IMasterFacet master = IMasterFacet(address(this));

        IERC20[] memory assets = new IERC20[](2);
        address[] memory tokensPool = new address[](2);
        uint256[] memory amounts = new uint256[](2);

        (tokensPool[0], tokensPool[1]) = master.getPoolTokens(paramsData.pair);

        prepareSwap(swapData, needTransfer);
        emit PoolPriceInitial(master.getCurrentPrice(paramsData.pair));
        swapOdos(swapData);
        emit PoolPriceAfterOdosSwap(master.getCurrentPrice(paramsData.pair));

        {
            address[] memory tokensIn = new address[](swapData.inputs.length);
            uint256[] memory amountsIn = new uint256[](swapData.inputs.length);
            for (uint256 i = 0; i < swapData.inputs.length; i++) {
                tokensIn[i] = swapData.inputs[i].tokenAddress;
                amountsIn[i] = swapData.inputs[i].amountIn;
            }
            emit InputTokens(tokensIn, amountsIn);
        }
        {
            address[] memory tokensOut = new address[](swapData.outputs.length);
            uint256[] memory amountsOut = new uint256[](swapData.outputs.length);
            for (uint256 i = 0; i < swapData.outputs.length; i++) {
                tokensOut[i] = swapData.outputs[i].tokenAddress;
                amountsOut[i] = IERC20(tokensOut[i]).balanceOf(address(this));
            }
            emit OutputTokens(tokensOut, amountsOut);
        }

        uint256[] memory initialAmounts = new uint256[](2);
        for (uint256 i = 0; i < 2; i++) {
            assets[i] = IERC20(tokensPool[i]);
            if (needTransfer && paramsData.amountsOut[i] > 0) {
                assets[i].transferFrom(msg.sender, address(this), paramsData.amountsOut[i]);
            }
            amounts[i] = assets[i].balanceOf(address(this));
            paramsData.amountsOut[i] = amounts[i];
            initialAmounts[i] = amounts[i];
        }
        emit InitialTokens(tokensPool, initialAmounts);

        tokenId = manageLiquidity(paramsData, tokenId);

        for (uint256 i = 0; i < 2; i++) {
            amounts[i] = amounts[i] - assets[i].balanceOf(address(this));
            paramsData.amountsOut[i] = assets[i].balanceOf(address(this));
        }
        emit PutIntoPool(tokensPool, amounts);

        adjustSwap(paramsData, tokenId);
        emit PoolPriceAfterSwap(master.getCurrentPrice(paramsData.pair));

        for (uint256 i = 0; i < 2; i++) {
            amounts[i] = assets[i].balanceOf(address(this));
            if (amounts[i] > 0) {
                assets[i].transfer(msg.sender, amounts[i]);
            }
        }
        emit ReturnedToUser(tokensPool, amounts);
    }

    function _zapOut(uint256 tokenId, address recipient, address feeRecipient) internal {
        IMasterFacet master = IMasterFacet(address(this));
        master.checkForOwner(tokenId, msg.sender);
        master.closePosition(tokenId, recipient, feeRecipient);
    }

    function prepareSwap(SwapData memory swapData, bool needTransfer) internal {
        for (uint256 i = 0; i < swapData.outputs.length; i++) {
            for (uint256 j = 0; j < i; j++) {
                require(
                    swapData.outputs[i].tokenAddress != swapData.outputs[j].tokenAddress,
                    "Duplicate output tokens"
                );
                require(
                    swapData.outputs[i].receiver == address(this), // TODO: remove from internal for
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
            if (needTransfer) {
                asset.transferFrom(msg.sender, address(this), swapData.inputs[i].amountIn);
            }
            asset.approve(LibCoreStorage.coreStorage().odosRouter, swapData.inputs[i].amountIn);
        }
    }

    function swapOdos(SwapData memory swapData) internal {
        (bool success,) = LibCoreStorage.coreStorage().odosRouter.call{value : 0}(swapData.data);
        require(success, "router swap invalid");

        for (uint256 i = 0; i < swapData.outputs.length; i++) {
            uint256 amountOut = IERC20(swapData.outputs[i].tokenAddress).balanceOf(address(this));
            if (amountOut < swapData.outputs[i].amountMin) {
                revert BelowAmountMin({
                    tokenAddress: swapData.outputs[i].tokenAddress,
                    amountMin: swapData.outputs[i].amountMin,
                    amountReceived: amountOut
                });
            }
        }
    }

    function manageLiquidity(ZapInParams memory paramsData, uint256 tokenId) internal returns (uint256) {
        address[] memory tokensOut = new address[](2);
        IMasterFacet master = IMasterFacet(address(this));
        (tokensOut[0], tokensOut[1]) = master.getPoolTokens(paramsData.pair);

        IERC20 asset0 = IERC20(tokensOut[0]);
        IERC20 asset1 = IERC20(tokensOut[1]);
        asset0.approve(LibCoreStorage.coreStorage().npm, paramsData.amountsOut[0]);
        asset1.approve(LibCoreStorage.coreStorage().npm, paramsData.amountsOut[1]);

        if (tokenId == 0) {
            tokenId = master.mintPosition(
                paramsData.pair,
                paramsData.tickRange[0],
                paramsData.tickRange[1],
                paramsData.amountsOut[0],
                paramsData.amountsOut[1],
                msg.sender
            );
            emit TokenId(tokenId);
        } else {
            master.increaseLiquidity(tokenId, paramsData.amountsOut[0], paramsData.amountsOut[1]);
        }
        return tokenId;
    }

    function adjustSwap(
        ZapInParams memory paramsData,
        uint256 tokenId
    ) internal {
        IMasterFacet master = IMasterFacet(address(this));
        address[] memory tokens = new address[](2);
        IERC20[] memory assets = new IERC20[](2);
        (tokens[0], tokens[1]) = master.getPoolTokens(paramsData.pair);

        assets[0] = IERC20(tokens[0]);
        assets[1] = IERC20(tokens[1]);
        bool zeroForOne = assets[0].balanceOf(address(this)) > assets[1].balanceOf(address(this));
        console.log("zeroForOne", zeroForOne);
        uint256 left;
        uint256 amountToSwap;
        uint256 right = assets[zeroForOne ? 0 : 1].balanceOf(address(this));

        for (uint256 i = 0; i < 10; i++) {
            amountToSwap = (left + right) / 2;
            console.log("i", i);
            console.log("left", left);
            console.log("right", right);
            console.log("amountToSwap", amountToSwap);

            try master.simulateSwap(
                paramsData.pair, 
                amountToSwap, 
                0, 
                zeroForOne, 
                paramsData.tickRange
            ) 
            {} catch (bytes memory _data) {
                bytes memory data;
                assembly {
                    data := add(_data, 4)
                }
                uint256[] memory swapResult = new uint256[](4);
                (swapResult[0], swapResult[1], swapResult[2], swapResult[3]) = abi.decode(data, (uint256, uint256, uint256, uint256));
                console.log("balance0", swapResult[0]);
                console.log("balance1", swapResult[1]);
                console.log("ratio0", swapResult[2]);
                console.log("ratio1", swapResult[3]);
                bool compareResult = zeroForOne ? 
                    compareRatios(swapResult[0], swapResult[1], swapResult[2], swapResult[3]) : 
                    compareRatios(swapResult[1], swapResult[0], swapResult[3], swapResult[2]);
                console.log("compareResult", compareResult);
                if (compareResult) {
                    left = amountToSwap;
                } else {
                    right = amountToSwap;
                }
            }
        }

        master.swap(paramsData.pair, amountToSwap, 0, zeroForOne);

        paramsData.amountsOut[0] = assets[0].balanceOf(address(this));
        paramsData.amountsOut[1] = assets[1].balanceOf(address(this));
        assets[0].approve(LibCoreStorage.coreStorage().npm, paramsData.amountsOut[0]);
        assets[1].approve(LibCoreStorage.coreStorage().npm, paramsData.amountsOut[1]);

        master.increaseLiquidity(tokenId, paramsData.amountsOut[0], paramsData.amountsOut[1]);

        uint256[] memory swapedIntoPool = new uint256[](2);
        swapedIntoPool[0] = paramsData.amountsOut[0] - assets[0].balanceOf(address(this));
        swapedIntoPool[1] = paramsData.amountsOut[1] - assets[1].balanceOf(address(this));
        emit SwapedIntoPool(tokens, swapedIntoPool);
        console.log("balance0 after addLiquidity", assets[0].balanceOf(address(this)));
        console.log("balance1 after addLiquidity", assets[1].balanceOf(address(this)));
    }

    function compareRatios(uint256 a, uint256 b, uint256 c, uint256 d) internal pure returns (bool) {
        return a * d > b * c;
    }

    // function adjustLiquidity(
    //     ZapInParams memory paramsData,
    //     uint256 tokenId,
    //     uint256[] memory positionRatio
    // ) internal {
    //     console.log("adjustLiquidity");
    //     IMasterFacet master = IMasterFacet(address(this));
    //     address[] memory tokens = new address[](2);
    //     (tokens[0], tokens[1]) = master.getPoolTokens(paramsData.pair);

    //     IERC20[] memory assets = new IERC20[](2);
    //     assets[0] = IERC20(tokens[0]);
    //     assets[1] = IERC20(tokens[1]);

    //     console.log("balance0 before", assets[0].balanceOf(address(this)));
    //     console.log("balance1 before", assets[1].balanceOf(address(this)));

    //     (uint256[] memory swapRatio, uint256[] memory amountsToSwap) = getRatios(paramsData);
    //     console.log("positionRatio0", positionRatio[0]);
    //     console.log("positionRatio1", positionRatio[1]);
    //     console.log("swapRatio0", swapRatio[0]);
    //     console.log("swapRatio1", swapRatio[1]);
    //     console.log("amountsToSwap0", amountsToSwap[0]);
    //     console.log("amountsToSwap1", amountsToSwap[1]);

    //     if (amountsToSwap[0] > amountsToSwap[1]) {
    //         // console.log("swap0", paramsData.amountsOut[0] - desiredAmount0);
    //         // ratio1 = estimateAmount1(paramsData.amountsOut[0] - desiredAmount0, master.getPoolSqrtRatioX96(paramsData.pair));
    //         // console.log("estimateAmount1", ratio1);
    //         master.swap(paramsData.pair, amountsToSwap[0] * 999 / 1000, 0, true);
    //     } 
    //     else {
    //         // console.log("swap1", paramsData.amountsOut[1] - desiredAmount1);
    //         // ratio0 = estimateAmount0(paramsData.amountsOut[1] - desiredAmount1, master.getPoolSqrtRatioX96(paramsData.pair));
    //         // console.log("estimateAmount0", ratio0);
    //         master.swap(paramsData.pair, amountsToSwap[1] * 999 / 1000, 0, false);
    //     }

    //     console.log("balance0 after swap", assets[0].balanceOf(address(this)));
    //     console.log("balance1 after swap", assets[1].balanceOf(address(this)));

        // paramsData.amountsOut[0] = assets[0].balanceOf(address(this));
        // paramsData.amountsOut[1] = assets[1].balanceOf(address(this));
        // assets[0].approve(LibCoreStorage.coreStorage().npm, paramsData.amountsOut[0]);
        // assets[1].approve(LibCoreStorage.coreStorage().npm, paramsData.amountsOut[1]);

    //     master.increaseLiquidity(tokenId, paramsData.amountsOut[0], paramsData.amountsOut[1]);

    //     uint256[] memory swapedIntoPool = new uint256[](2);
    //     swapedIntoPool[0] = paramsData.amountsOut[0] - assets[0].balanceOf(address(this));
    //     swapedIntoPool[1] = paramsData.amountsOut[1] - assets[1].balanceOf(address(this));
    //     emit SwapedIntoPool(tokens, swapedIntoPool);
    //     console.log("balance0 after addLiquidity", assets[0].balanceOf(address(this)));
    //     console.log("balance1 after addLiquidity", assets[1].balanceOf(address(this)));
    // }

    // function estimateAmount1(uint256 amount0, uint160 sqrtPriceX96) public view returns (uint256 amount1) {
    //     IMasterFacet master = IMasterFacet(address(this));
    //     uint256 sqrtPriceX96Wide = uint256(sqrtPriceX96);
        
    //     amount1 = master.mulDiv(
    //         master.mulDiv(amount0, sqrtPriceX96Wide, 2**96),
    //         sqrtPriceX96Wide,
    //     2**96
    //     );
    // }

    // function estimateAmount0(uint256 amount1, uint160 sqrtPriceX96) internal view returns (uint256 amount0) {
    //     IMasterFacet master = IMasterFacet(address(this));
    //     uint256 sqrtPriceX96Wide = uint256(sqrtPriceX96);

    //     amount0 = master.mulDiv(
    //         amount1,
    //         2**96,
    //         sqrtPriceX96Wide
    //     );
    //     amount0 = master.mulDiv(
    //         amount0,
    //         2**96,
    //         sqrtPriceX96Wide
    //     );
    // }

    // function getRatios(ZapInParams memory paramsData) internal view returns (
    //     uint256[] memory swapRatio,
    //     uint256[] memory amountsToSwap
    //     ) {
    //     swapRatio = new uint256[](2);
    //     uint256[] memory positionRatio = new uint256[](2);

    //     amountsToSwap = new uint256[](2);
    //     IMasterFacet master = IMasterFacet(address(this));
    //     (positionRatio[0], positionRatio[1]) = master.getProportion(paramsData.pair, paramsData.tickRange);
        
    //     uint160 sqrtRatioX96 = master.getPoolSqrtRatioX96(paramsData.pair);
    //     swapRatio[0] = 10**18;
    //     swapRatio[1] = estimateAmount0(swapRatio[0], sqrtRatioX96);

    //     // (amount1 - y) / (amount0 + (beta / alpha) * y) = (B / A)
    //     // A * (amount1 - y) = B * (amount0 + (beta / alpha) * y)
    //     // A * amount1 - A * y = B * amount0 + B * (beta / alpha) * y
    //     // A * amount1 - B * amount0 = (A + B * (beta / alpha)) * y
    //     // y = (A * amount1 - B * amount0) / (A + B * (beta / alpha))

    //     // (amount0 - x) / (amount1 + (alpha / beta) * x) = (A / B)
    //     // B * (amount0 - x) = A * (amount1 + (alpha / beta) * x)
    //     // B * amount0 - B * x = A * amount1 + A * (alpha / beta) * x
    //     // B * amount0 - A * amount1 = (B + A * (alpha / beta)) * x
    //     // x = (B * amount0 - A * amount1) / (B + A * (alpha / beta))

    //     console.log("paramsData.amountsOut[0]", paramsData.amountsOut[0]);
    //     console.log("paramsData.amountsOut[1]", paramsData.amountsOut[1]);

    //     console.log("positionRatio[0]", positionRatio[0]);
    //     console.log("positionRatio[1]", positionRatio[1]);
    //     console.log("swapRatio[0]", swapRatio[0]);
    //     console.log("swapRatio[1]", swapRatio[1]);
    //     uint256 numerator;
    //     uint256 denominator;
    //     if (positionRatio[0] * paramsData.amountsOut[1] > positionRatio[1] * paramsData.amountsOut[0]) {
    //         numerator = positionRatio[0] * paramsData.amountsOut[1] - positionRatio[1] * paramsData.amountsOut[0];
    //         denominator = master.mulDiv(positionRatio[1], swapRatio[1], swapRatio[0]) + positionRatio[0];
    //         amountsToSwap[1] = numerator / denominator;
    //         console.log("0 numerator", numerator);
    //         console.log("0 denominator", denominator);
    //     } else {
    //         numerator = positionRatio[1] * paramsData.amountsOut[0] - positionRatio[0] * paramsData.amountsOut[1];
    //         denominator = master.mulDiv(positionRatio[0], swapRatio[0], swapRatio[1]) + positionRatio[1];
    //         amountsToSwap[0] = numerator / denominator;
    //         console.log("1 numerator", numerator);
    //         console.log("1 denominator", denominator);
    //     }
    // }
}
