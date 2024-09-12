//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "../../interfaces/IMasterFacet.sol";
import "../../libraries/core/LibCoreStorage.sol";

contract ZapFacet is IZapFacet {
    event InputTokens(address[] tokens, uint256[] amounts);
    event OutputTokens(address[] tokens, uint256[] amounts);
    event PutIntoPool(address[] tokens, uint256[] amounts);
    event SwappedIntoPool(address[] tokens, uint256[] amounts);
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

        for (uint256 i = 0; i < 2; i++) {
            assets[i] = IERC20(tokensPool[i]);
            if (needTransfer && paramsData.amountsOut[i] > 0) {
                assets[i].transferFrom(msg.sender, address(this), paramsData.amountsOut[i]);
            }
            amounts[i] = assets[i].balanceOf(address(this));
            paramsData.amountsOut[i] = amounts[i];
        }

        tokenId = manageLiquidity(paramsData, tokenId);

        for (uint256 i = 0; i < 2; i++) {
            amounts[i] = amounts[i] - assets[i].balanceOf(address(this));
            paramsData.amountsOut[i] = assets[i].balanceOf(address(this));
        }
        emit PutIntoPool(tokensPool, amounts);

        adjustLiquidity(paramsData, tokenId);
        emit PoolPriceAfterSwap(master.getCurrentPrice(paramsData.pair));
        for (uint256 i = 0; i < 2; i++) {
            amounts[i] = amounts[i] - assets[i].balanceOf(address(this));
        }
        emit SwappedIntoPool(tokensPool, amounts);

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

    function adjustLiquidity(
        ZapInParams memory paramsData,
        uint256 tokenId
    ) internal {
        IMasterFacet master = IMasterFacet(address(this));
        (uint256 ratio0, uint256 ratio1) = master.getProportion(paramsData.pair, paramsData.tickRange);
        (address token0Address, address token1Address) = master.getPoolTokens(paramsData.pair);

        IERC20[] memory assets = new IERC20[](2);
        assets[0] = IERC20(token0Address);
        assets[1] = IERC20(token1Address);

        uint256 totalAmount = paramsData.amountsOut[0] + paramsData.amountsOut[1];
        uint256 desiredAmount0 = master.mulDiv(totalAmount, ratio0, ratio0 + ratio1);
        uint256 desiredAmount1 = totalAmount - desiredAmount0;

        if (paramsData.amountsOut[0] > desiredAmount0) {
            master.swap(paramsData.pair, paramsData.amountsOut[0] - desiredAmount0, 0, true);
        } 
        else {
            master.swap(paramsData.pair, paramsData.amountsOut[1] - desiredAmount1, 0, false);
        }

        paramsData.amountsOut[0] = assets[0].balanceOf(address(this));
        paramsData.amountsOut[1] = assets[1].balanceOf(address(this));
        assets[0].approve(LibCoreStorage.coreStorage().npm, paramsData.amountsOut[0]);
        assets[1].approve(LibCoreStorage.coreStorage().npm, paramsData.amountsOut[1]);

        master.increaseLiquidity(tokenId, paramsData.amountsOut[0], paramsData.amountsOut[1]);
    }
}
