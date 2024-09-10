//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "../../interfaces/IMasterFacet.sol";
import "../../libraries/core/LibCoreStorage.sol";

contract ZapFacet is IZapFacet {

    // Контракт успешной транзакции создает события:
    // - Сколько подали токенов на вход
    // - Сколько получили в результате обмена
    // - Сколько положили в пул
    // - Сколько вернули пользователю

    event InputTokens(uint256[] amountsIn, address[] tokensIn);
    event OutputTokens(uint256[] amountsOut, address[] tokensOut);
    event PutIntoPool(uint256[] amountsPut, address[] tokensPut);
    event ReturnedToUser(uint256[] amountsReturned, address[] tokensReturned);
    event AdjustedSwap(uint256 amount0, uint256 amount1);
    event TokenId(uint256 tokenId); // name..?

    receive() external payable {}

    error BelowAmountMin(address tokenAddress, uint256 amountMin, uint256 amountReceived);


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
        prepareSwap(swapData, needTransfer);

        address[] memory tokensOut = new address[](2);
        IERC20[] memory assets = new IERC20[](2);
        uint256[] memory amounts = new uint256[](2);

        uint256[] memory amountsBefore = new uint256[](2);
        uint256[] memory amountsPut = new uint256[](2);
        
        (tokensOut[0], tokensOut[1]) = master.getPoolTokens(paramsData.pair);
        
        for (uint256 i = 0; i < 2; i++) {
            assets[i] = IERC20(tokensOut[i]);
            if (needTransfer && paramsData.amountsOut[i] > 0) {
                assets[i].transferFrom(msg.sender, address(this), paramsData.amountsOut[i]);
            }
            paramsData.amountsOut[i] = assets[i].balanceOf(address(this));
            amountsBefore[i] = paramsData.amountsOut[i];
        }

        swapOdos(swapData);
        tokenId = manageLiquidity(paramsData, tokenId);
        for (uint256 i = 0; i < 2; i++) {
            amounts[i] = assets[i].balanceOf(address(this));
            amountsPut[i] = amountsBefore[i] - amounts[i];
        }
        emit PutIntoPool(amountsPut, tokensOut);
        adjustLiquidity(paramsData.pair, paramsData.tickRange, tokenId, amounts);

        for (uint256 i = 0; i < 2; i++) {
            amounts[i] = assets[i].balanceOf(address(this));
            if (amounts[i] > 0) {
                assets[i].transfer(msg.sender, amounts[i]);
            }
        }
        emit ReturnedToUser(amounts, tokensOut);
    }

    function _zapOut(uint256 tokenId, address recipient, address feeRecipient) internal {
        IMasterFacet master = IMasterFacet(address(this));
        master.checkForOwner(tokenId, msg.sender);
        master.closePosition(tokenId, recipient, feeRecipient);
    }

    function manageLiquidity(ZapInParams memory paramsData, uint256 tokenId) internal returns (uint256) {
        address[] memory tokensOut = new address[](2);
        IMasterFacet master = IMasterFacet(address(this));
        (tokensOut[0], tokensOut[1]) = master.getPoolTokens(paramsData.pair);
//        ResultOfLiquidity memory result;

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

    function swapOdos(SwapData memory swapData) internal returns (address[] memory, uint256[] memory) {
        (bool success,) = LibCoreStorage.coreStorage().odosRouter.call{value : 0}(swapData.data);
        require(success, "router swap invalid");

        // Emit events
        address[] memory tokensOut = new address[](swapData.outputs.length);
        uint256[] memory amountsOut = new uint256[](swapData.outputs.length);
        for (uint256 i = 0; i < swapData.outputs.length; i++) {
            tokensOut[i] = swapData.outputs[i].tokenAddress;
            amountsOut[i] = IERC20(tokensOut[i]).balanceOf(swapData.outputs[i].receiver);
            if (amountsOut[i] < swapData.outputs[i].amountMin) {
                revert BelowAmountMin({
                    tokenAddress: tokensOut[i],
                    amountMin: swapData.outputs[i].amountMin,
                    amountReceived: amountsOut[i]
                });
            }
        }

        address[] memory tokensIn = new address[](swapData.inputs.length);
        uint256[] memory amountsIn = new uint256[](swapData.inputs.length);
        for (uint256 i = 0; i < swapData.inputs.length; i++) {
            tokensIn[i] = swapData.inputs[i].tokenAddress;
            amountsIn[i] = swapData.inputs[i].amountIn;
        }

        emit InputTokens(amountsIn, tokensIn);
        emit OutputTokens(amountsOut, tokensOut);
        return (tokensOut, amountsOut);
    }

    function adjustLiquidity(
        address pair,
        int24[] memory tickRange,
        uint256 tokenId,
        uint256[] memory amounts
    ) internal {
        IMasterFacet master = IMasterFacet(address(this));
        uint160 sqrtRatio = master.getPoolSqrtRatioX96(pair);
        (uint256 ratio0, uint256 ratio1) = master.getProportion(pair, tickRange);

        uint256 totalAmount = amounts[0] + amounts[1];
        uint256 desiredAmount0 = (totalAmount * ratio0) / (ratio0 + ratio1);
        uint256 desiredAmount1 = totalAmount - desiredAmount0;

        if (amounts[0] > desiredAmount0) {
            master.swap(pair, amounts[0] - desiredAmount0, sqrtRatio, true);
        } else {
            master.swap(pair, amounts[1] - desiredAmount1, sqrtRatio, false);
        }
        (address token0Address, address token1Address) = master.getPoolTokens(pair);
        uint256 amount0 = IERC20(token0Address).balanceOf(address(this));
        uint256 amount1 = IERC20(token1Address).balanceOf(address(this));

        emit AdjustedSwap(amount0, amount1);
        master.increaseLiquidity(tokenId, amount0, amount1);
    }
}
