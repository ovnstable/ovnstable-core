//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "../../interfaces/core/IChainFacet.sol";
import "../../interfaces/core/IZapFacet.sol";
import "../../libraries/core/LibCoreStorage.sol";

contract ZapFacet is IZapFacet, IChainFacet {

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

    function prepareSwap(SwapData memory swapData) internal {
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
            asset.transferFrom(msg.sender, address(this), swapData.inputs[i].amountIn);
            asset.approve(LibCoreStorage.coreStorage().odosRouter, swapData.inputs[i].amountIn);
        }
    }

    function swap(SwapData memory swapData) internal returns (address[] memory, uint256[] memory) {
        (bool success,) = LibCoreStorage.coreStorage().odosRouter.call{value : 0}(swapData.data);
        require(success, "router swap invalid");

        // Emit events
        address[] memory tokensIn = new address[](swapData.inputs.length);
        uint256[] memory amountsIn = new uint256[](swapData.inputs.length);
        for (uint256 i = 0; i < swapData.inputs.length; i++) {
            tokensIn[i] = swapData.inputs[i].tokenAddress;
            amountsIn[i] = swapData.inputs[i].amountIn;
        }
        emit InputTokens(amountsIn, tokensIn);

        address[] memory tokensOut = new address[](swapData.outputs.length);
        uint256[] memory amountsOut = new uint256[](swapData.outputs.length);
        for (uint256 i = 0; i < swapData.outputs.length; i++) {
            tokensOut[i] = swapData.outputs[i].tokenAddress;
            amountsOut[i] = IERC20(tokensOut[i]).balanceOf(swapData.outputs[i].receiver);
        }
        emit OutputTokens(amountsOut, tokensOut);
        return (tokensOut, amountsOut);
    }

    function zapIn(SwapData memory swapData, ZapInParams memory paramsData) external {
        prepareSwap(swapData);
        swap(swapData);
        address[] memory tokensOut = new address[](2);
        (tokensOut[0], tokensOut[1]) = IChainFacet.getPoolTokens(paramsData.pair);

        for (uint256 i = 0; i < tokensOut.length; i++) {
            IERC20 asset = IERC20(tokensOut[i]);
            if (paramsData.amountsOut[i] > 0) {
                asset.transferFrom(msg.sender, address(this), paramsData.amountsOut[i]);
            }
            paramsData.amountsOut[i] = asset.balanceOf(address(this));
        }
        addLiquidity(paramsData);
    }

    function addLiquidity(ZapInParams memory paramsData) internal {
        address[] memory tokensOut = new address[](2);
        (tokensOut[0], tokensOut[1]) = IChainFacet.getPoolTokens(paramsData.pair);
        ResultOfLiquidity memory result;

        IERC20 asset0 = IERC20(tokensOut[0]);
        IERC20 asset1 = IERC20(tokensOut[1]);
        asset0.approve(LibCoreStorage.coreStorage().npm, paramsData.amountsOut[0]);
        asset1.approve(LibCoreStorage.coreStorage().npm, paramsData.amountsOut[1]);

        result.amountAsset0Before = asset0.balanceOf(address(this));
        result.amountAsset1Before = asset1.balanceOf(address(this));

        (uint256 tokenId,,,) = IChainFacet.mintPosition(
            paramsData.pair,
            paramsData.tickRange[0],
            paramsData.tickRange[1],
            paramsData.amountsOut[0],
            paramsData.amountsOut[1]
        );
        emit TokenId(tokenId);

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
}
