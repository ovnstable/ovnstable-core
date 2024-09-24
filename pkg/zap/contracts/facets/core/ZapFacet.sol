//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "../../interfaces/IMasterFacet.sol";
import "../../libraries/core/LibCoreStorage.sol";

contract ZapFacet is IZapFacet {

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

    struct PoolTokens {
        address[] token;
        IERC20[] asset;
        uint256[] amount;
    }

    struct TokenAmounts {
        address[] tokens;
        uint256[] initial;
        uint256[] put;
        uint256[] returned;
    }

    function _zapIn(
        SwapData memory swapData,
        ZapInParams memory paramsData,
        bool needTransfer,
        uint256 tokenId
    ) internal {
        validateInputs(swapData, paramsData);

        for (uint256 i = 0; i < swapData.inputs.length; i++) {
            IERC20 asset = IERC20(swapData.inputs[i].tokenAddress);
            if (needTransfer) {
                asset.transferFrom(msg.sender, address(this), swapData.inputs[i].amountIn);
            }
            asset.approve(LibCoreStorage.coreStorage().odosRouter, swapData.inputs[i].amountIn);
        }
        swapOdos(swapData);

        PoolTokens memory poolTokens = PoolTokens({
            token: new address[](2),
            asset: new IERC20[](2),
            amount: new uint256[](2)
        });
        TokenAmounts memory tokenAmounts = TokenAmounts({
            tokens: new address[](2),
            initial: new uint256[](2),
            put: new uint256[](2),
            returned: new uint256[](2)
        });
        (poolTokens.token[0], poolTokens.token[1]) = masterFacet().getPoolTokens(paramsData.pool);
        tokenAmounts.tokens = poolTokens.token;

        for (uint256 i = 0; i < 2; i++) {
            poolTokens.asset[i] = IERC20(poolTokens.token[i]);
            if (needTransfer && paramsData.amountsOut[i] > 0) {
                poolTokens.asset[i].transferFrom(msg.sender, address(this), paramsData.amountsOut[i]);
            }
            poolTokens.amount[i] = poolTokens.asset[i].balanceOf(address(this));
            paramsData.amountsOut[i] = poolTokens.amount[i];
        }
        tokenAmounts.initial = poolTokens.amount;

        uint256[] memory positionAmounts = new uint256[](2);
        uint256[] memory newPositionAmounts = new uint256[](2);
        if (tokenId != 0) {
            (positionAmounts[0], positionAmounts[1]) = masterFacet().getPositionAmounts(tokenId);
        }
        tokenId = manageLiquidity(paramsData, poolTokens, tokenId);
        adjustSwap(paramsData, poolTokens, tokenId);
        (newPositionAmounts[0], newPositionAmounts[1]) = masterFacet().getPositionAmounts(tokenId);

        for (uint256 i = 0; i < 2; i++) {
            if (newPositionAmounts[i] > positionAmounts[i]) {
                tokenAmounts.put[i] = newPositionAmounts[i] - positionAmounts[i];
            }
            tokenAmounts.returned[i] = poolTokens.asset[i].balanceOf(address(this));
            if (tokenAmounts.returned[i] > 0) {
                poolTokens.asset[i].transfer(msg.sender, tokenAmounts.returned[i]);
            }
        }
        for (uint256 i = 0; i < swapData.inputs.length; i++) {
            IERC20 asset = IERC20(swapData.inputs[i].tokenAddress);
            uint256 balance = asset.balanceOf(address(this));
            if (balance > 0) {
                asset.transfer(msg.sender, balance);
            }
        }
        if (!paramsData.isSimulation) {
            emit ZapResult(tokenAmounts.tokens, tokenAmounts.initial, tokenAmounts.put, tokenAmounts.returned);
        } else {
            revert SimulationResult(
                tokenAmounts.tokens, 
                tokenAmounts.initial, 
                tokenAmounts.put, 
                tokenAmounts.returned, 
                paramsData.adjustSwapAmount, 
                paramsData.adjustSwapSide
            );
        }
    }

    function _zapOut(uint256 tokenId, address recipient, address feeRecipient) internal {
        masterFacet().checkForOwner(tokenId, msg.sender);
        masterFacet().closePosition(tokenId, recipient, feeRecipient);
    }

    function validateInputs(SwapData memory swapData, ZapInParams memory paramsData) internal view {
        for (uint256 i = 0; i < swapData.inputs.length; i++) {
            for (uint256 j = 0; j < i; j++) {
                require(
                    swapData.inputs[i].tokenAddress != swapData.inputs[j].tokenAddress,
                    "Duplicate input tokens"
                );
            }
            require(swapData.inputs[i].amountIn > 0, "Input amount is 0");
        }

        require(paramsData.amountsOut.length == 2, "Invalid output length, must be exactly 2");
        require(masterFacet().isValidPool(paramsData.pool), "Pool address in not valid");
        require(paramsData.tickRange.length == 2, "Invalid tick range length, must be exactly 2");
        require(paramsData.tickRange[0] < paramsData.tickRange[1], "Invalid tick range");
    }

    function swapOdos(SwapData memory swapData) internal {
        if (swapData.inputs.length > 0) {
            (bool success,) = LibCoreStorage.coreStorage().odosRouter.call{value : 0}(swapData.data);
            require(success, "router swap invalid");
        }

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
    }

    function manageLiquidity(ZapInParams memory paramsData, PoolTokens memory poolTokens, uint256 tokenId) internal returns (uint256) {
        poolTokens.asset[0].approve(LibCoreStorage.coreStorage().npm, poolTokens.amount[0]);
        poolTokens.asset[1].approve(LibCoreStorage.coreStorage().npm, poolTokens.amount[1]);

        if (tokenId == 0) {
            tokenId = masterFacet().mintPosition(
                paramsData.pool,
                paramsData.tickRange[0],
                paramsData.tickRange[1],
                poolTokens.amount[0],
                poolTokens.amount[1],
                msg.sender
            );
            emit TokenId(tokenId);
        } else {
            masterFacet().increaseLiquidity(tokenId, poolTokens.amount[0], poolTokens.amount[1]);
        }
        return tokenId;
    }

    function adjustSwap(
        ZapInParams memory paramsData,
        PoolTokens memory poolTokens,
        uint256 tokenId
    ) internal {
        if (paramsData.isSimulation) {
            (paramsData.adjustSwapAmount, paramsData.adjustSwapSide) = simulateSwap(paramsData, poolTokens);
        }
        if (paramsData.adjustSwapAmount > 0) {
            masterFacet().swap(paramsData.pool, paramsData.adjustSwapAmount, 0, paramsData.adjustSwapSide);
        }
        
        paramsData.amountsOut[0] = poolTokens.asset[0].balanceOf(address(this));
        paramsData.amountsOut[1] = poolTokens.asset[1].balanceOf(address(this));
        poolTokens.asset[0].approve(LibCoreStorage.coreStorage().npm, paramsData.amountsOut[0]);
        poolTokens.asset[1].approve(LibCoreStorage.coreStorage().npm, paramsData.amountsOut[1]);

        console.log("increaseLiquidity", paramsData.amountsOut[0], paramsData.amountsOut[1]);
        masterFacet().increaseLiquidity(tokenId, paramsData.amountsOut[0], paramsData.amountsOut[1]);
        console.log("increaseLiquidity done");
    }

    struct BinSearchParams {
        uint256 left;
        uint256 right;
        uint256 mid;
    }

    function simulateSwap(
        ZapInParams memory paramsData, 
        PoolTokens memory poolTokens
    ) internal returns (uint256 amountToSwap, bool zeroForOne) {
        zeroForOne = poolTokens.asset[0].balanceOf(address(this)) > poolTokens.asset[1].balanceOf(address(this));
        BinSearchParams memory binSearchParams;
        binSearchParams.right = poolTokens.asset[zeroForOne ? 0 : 1].balanceOf(address(this));

        for (uint256 i = 0; i < LibCoreStorage.coreStorage().binSearchIterations; i++) {
            binSearchParams.mid = (binSearchParams.left + binSearchParams.right) / 2;

            try masterFacet().simulateSwap(
                paramsData.pool, 
                binSearchParams.mid, 
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
                bool compareResult = zeroForOne ? 
                    masterFacet().compareRatios(swapResult[0], swapResult[1], swapResult[2], swapResult[3]) : 
                    masterFacet().compareRatios(swapResult[1], swapResult[0], swapResult[3], swapResult[2]);
                if (compareResult) {
                    binSearchParams.left = binSearchParams.mid;
                } else {
                    binSearchParams.right = binSearchParams.mid;
                }
            }
        }
        amountToSwap = binSearchParams.mid;
    }

    function masterFacet() internal view returns (IMasterFacet) {
        return IMasterFacet(address(this));
    }
}
