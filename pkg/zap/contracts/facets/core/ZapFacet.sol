//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "../../interfaces/IMasterFacet.sol";
import "../../libraries/core/LibCoreStorage.sol";

contract ZapFacet is IZapFacet {
    event InputTokens(address[] tokens, uint256[] amounts);
    event OutputTokens(address[] tokens, uint256[] amounts);
    event ZapResult(
        address[] tokens, 
        uint256[] initialAmounts, 
        uint256[] putAmounts, 
        uint256[] returnedAmounts
    );
    // event PutIntoPool(address[] tokens, uint256[] amounts);
    // event ReturnedToUser(address[] tokens, uint256[] amounts);
    event TokenId(uint256 tokenId);

    error BelowAmountMin(address tokenAddress, uint256 amountMin, uint256 amountReceived);
    error SimulationResult(
        address[] tokens, 
        uint256[] initialAmounts, 
        uint256[] putAmounts, 
        uint256[] returnedAmounts,
        uint256 amountToSwap,
        bool swapSide
    );

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
        // TODO: require 
        IMasterFacet master = IMasterFacet(address(this));

        prepareSwap(swapData, needTransfer);
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
        (poolTokens.token[0], poolTokens.token[1]) = master.getPoolTokens(paramsData.pair);
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
            (positionAmounts[0], positionAmounts[1]) = master.getPositionAmounts(tokenId);
        }
        tokenId = manageLiquidity(paramsData, poolTokens, tokenId);
        if (swapData.needToAdjust) {
            adjustSwap(swapData, paramsData, poolTokens, tokenId);
        }
        (newPositionAmounts[0], newPositionAmounts[1]) = master.getPositionAmounts(tokenId);

        for (uint256 i = 0; i < 2; i++) {
            require(newPositionAmounts[i] >= positionAmounts[i], "Decrease in liquidity");
            tokenAmounts.put[i] = newPositionAmounts[i] - positionAmounts[i];
            tokenAmounts.returned[i] = poolTokens.asset[i].balanceOf(address(this));
            if (tokenAmounts.returned[i] > 0) {
                poolTokens.asset[i].transfer(msg.sender, tokenAmounts.returned[i]);
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
                swapData.adjustSwapAmount, 
                swapData.adjustSwapSide
            );
        }
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
        IMasterFacet master = IMasterFacet(address(this));

        poolTokens.asset[0].approve(LibCoreStorage.coreStorage().npm, poolTokens.amount[0]);
        poolTokens.asset[1].approve(LibCoreStorage.coreStorage().npm, poolTokens.amount[1]);

        if (tokenId == 0) {
            tokenId = master.mintPosition(
                paramsData.pair,
                paramsData.tickRange[0],
                paramsData.tickRange[1],
                poolTokens.amount[0],
                poolTokens.amount[1],
                msg.sender
            );
            emit TokenId(tokenId);
        } else {
            master.increaseLiquidity(tokenId, poolTokens.amount[0], poolTokens.amount[1]); // TODO : check for out of range
        }
        return tokenId;
    }

    function adjustSwap(
        SwapData memory swapData,
        ZapInParams memory paramsData,
        PoolTokens memory poolTokens,
        uint256 tokenId
    ) internal {
        IMasterFacet master = IMasterFacet(address(this));
        
        if (paramsData.isSimulation) {
            (swapData.adjustSwapAmount, swapData.adjustSwapSide) = simulateSwap(paramsData, poolTokens);
        }
        master.swap(paramsData.pair, swapData.adjustSwapAmount, 0, swapData.adjustSwapSide);

        paramsData.amountsOut[0] = poolTokens.asset[0].balanceOf(address(this));
        paramsData.amountsOut[1] = poolTokens.asset[1].balanceOf(address(this));
        poolTokens.asset[0].approve(LibCoreStorage.coreStorage().npm, paramsData.amountsOut[0]);
        poolTokens.asset[1].approve(LibCoreStorage.coreStorage().npm, paramsData.amountsOut[1]);

        master.increaseLiquidity(tokenId, paramsData.amountsOut[0], paramsData.amountsOut[1]);
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
        IMasterFacet master = IMasterFacet(address(this));
        zeroForOne = poolTokens.asset[0].balanceOf(address(this)) > poolTokens.asset[1].balanceOf(address(this));
        BinSearchParams memory binSearchParams;
        binSearchParams.right = poolTokens.asset[zeroForOne ? 0 : 1].balanceOf(address(this));

        for (uint256 i = 0; i < LibCoreStorage.coreStorage().binSearchIterations; i++) {
            binSearchParams.mid = (binSearchParams.left + binSearchParams.right) / 2;

            try master.simulateSwap(
                paramsData.pair, 
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
                    master.compareRatios(swapResult[0], swapResult[1], swapResult[2], swapResult[3]) : 
                    master.compareRatios(swapResult[1], swapResult[0], swapResult[3], swapResult[2]);
                if (compareResult) {
                    binSearchParams.left = binSearchParams.mid;
                } else {
                    binSearchParams.right = binSearchParams.mid;
                }
            }
        }
        amountToSwap = binSearchParams.mid;
    }
}
