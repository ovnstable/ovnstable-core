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

    event TokenId(uint256 tokenId); // name..?

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

    function merge(uint256 tokenIn, uint256[] memory tokensOut) external {
        IMasterFacet master = IMasterFacet(address(this));
        (address token0In, address token1In) = master.getTokens(tokenIn);

        for (uint256 i = 0; i < tokensOut.length; i++) {
            (address token0, address token1) = master.getTokens(tokensOut[i]);
            require(token0In == token0 && token1In == token1, 'different pools');
        }

        for (uint256 i = 0; i < tokensOut.length; i++) {
            _zapOut(tokensOut[i], address(this), address(this));
        }

        ZapInParams memory params;
        params.tickRange = new int24[](2);
        params.amountsOut = new uint256[](2);

        params.pair = master.getPool(tokenIn);
        (params.tickRange[0], params.tickRange[1]) = master.getTicks(tokenIn);
        IERC20 asset0 = IERC20(token0In);
        IERC20 asset1 = IERC20(token1In);
        params.amountsOut[0] = asset0.balanceOf(address(this));
        params.amountsOut[1] = asset1.balanceOf(address(this));
        manageLiquidity(params, tokenIn);
    }

    function _zapIn(
        SwapData memory swapData,
        ZapInParams memory paramsData,
        bool needTransfer,
        uint256 tokenId
    ) internal {
        prepareSwap(swapData, needTransfer);
        swap(swapData);
        IMasterFacet master = IMasterFacet(address(this));
        address[] memory tokensOut = new address[](2);
        (tokensOut[0], tokensOut[1]) = master.getPoolTokens(paramsData.pair);

        for (uint256 i = 0; i < tokensOut.length; i++) {
            IERC20 asset = IERC20(tokensOut[i]);
            if (needTransfer && paramsData.amountsOut[i] > 0) {
                asset.transferFrom(msg.sender, address(this), paramsData.amountsOut[i]);
            }
            paramsData.amountsOut[i] = asset.balanceOf(address(this));
        }
        manageLiquidity(paramsData, tokenId);
    }

    function _zapOut(uint256 tokenId, address recipient, address feeRecipient) internal {
        IMasterFacet master = IMasterFacet(address(this));
        master.checkForOwner(tokenId, msg.sender);
        master.closePosition(tokenId, recipient, feeRecipient);
    }

    function manageLiquidity(ZapInParams memory paramsData, uint256 tokenId) internal {
        address[] memory tokensOut = new address[](2);
        IMasterFacet master = IMasterFacet(address(this));
        (tokensOut[0], tokensOut[1]) = master.getPoolTokens(paramsData.pair);
        ResultOfLiquidity memory result;

        IERC20 asset0 = IERC20(tokensOut[0]);
        IERC20 asset1 = IERC20(tokensOut[1]);
        asset0.approve(LibCoreStorage.coreStorage().npm, paramsData.amountsOut[0]);
        asset1.approve(LibCoreStorage.coreStorage().npm, paramsData.amountsOut[1]);

        result.amountAsset0Before = asset0.balanceOf(address(this));
        result.amountAsset1Before = asset1.balanceOf(address(this));

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

    function swap(SwapData memory swapData) internal returns (address[] memory, uint256[] memory) {
        (bool success,) = LibCoreStorage.coreStorage().odosRouter.call{value : 0}(swapData.data);
        require(success, "router swap invalid");

        // Emit events

        address[] memory tokensOut = new address[](swapData.outputs.length);
        uint256[] memory amountsOut = new uint256[](swapData.outputs.length);
        for (uint256 i = 0; i < swapData.outputs.length; i++) {
            tokensOut[i] = swapData.outputs[i].tokenAddress;
            amountsOut[i] = IERC20(tokensOut[i]).balanceOf(swapData.outputs[i].receiver);
            require(amountsOut[i] >= swapData.outputs[i].amountMin, "below min swap amount");
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
}
