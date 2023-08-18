// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./OdosZap.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

import "@overnight-contracts/connectors/contracts/stuff/Camelot.sol";

contract DemetorZap is OdosZap {
    PositionHelper public positionHelper;

    struct ZapParams {
        address positionHelper;
        address odosRouter;
    }

    struct DemetorZapInParams {
        address gauge;
        uint256[] amountsOut;
    }

    function setParams(ZapParams memory params) external onlyAdmin {
        require(params.positionHelper != address(0), "Zero address not allowed");
        require(params.odosRouter != address(0), "Zero address not allowed");

        positionHelper = PositionHelper(params.positionHelper);
        odosRouter = params.odosRouter;
    }

    function zapIn(SwapData memory swapData, DemetorZapInParams memory demetorData) external {
        _prepareSwap(swapData);
        _swap(swapData);

        INFTPool gauge = INFTPool(demetorData.gauge);        
        (address _token,,,,,,,) = gauge.getPoolInfo();
        ICamelotPair pair = ICamelotPair(_token);

        address[] memory tokensOut = new address[](2);
        tokensOut[0] = pair.token0();
        tokensOut[1] = pair.token1();
        uint256[] memory amountsOut = new uint256[](2);
        IERC20[] memory assets = new IERC20[](2);

        for (uint256 i = 0; i < tokensOut.length; i++) {
            assets[i] = IERC20(tokensOut[i]);
            if (demetorData.amountsOut[i] > 0) {
                assets[i].transferFrom(msg.sender, address(this), demetorData.amountsOut[i]);
            }
            amountsOut[i] = assets[i].balanceOf(address(this));
        }
        (uint256 reserve0, uint256 reserve1,, ) = pair.getReserves();
        uint256[] memory tokensAmount = getAmountToSwap(
            amountsOut[0],
            amountsOut[1],
            reserve0,
            reserve1,
            10 ** IERC20Metadata(tokensOut[0]).decimals(),
            10 ** IERC20Metadata(tokensOut[1]).decimals()
        );
        IERC20(tokensOut[0]).approve(address(positionHelper), tokensAmount[0]);
        IERC20(tokensOut[1]).approve(address(positionHelper), tokensAmount[1]);

        _addLiquidity(gauge, tokensOut, tokensAmount);
        _emitEvents(assets, amountsOut, tokensOut);
    }

    function getProportion(
        address _gauge
    ) public view returns (uint256 token0Amount, uint256 token1Amount, uint256 denominator) {
        INFTPool gauge = INFTPool(_gauge);
        (address _token,,,,,,,) = gauge.getPoolInfo();
        ICamelotPair pair = ICamelotPair(_token);
        (uint256 reserve0, uint256 reserve1,, ) = pair.getReserves();
        address token0 = pair.token0();
        address token1 = pair.token1();
        uint256 dec0 = IERC20Metadata(token0).decimals();
        uint256 dec1 = IERC20Metadata(token1).decimals();
        denominator = 10 ** (dec0 > dec1 ? dec0 : dec1);
        token0Amount = reserve0 * (denominator / (10 ** dec0));
        token1Amount = reserve1 * (denominator / (10 ** dec1));
    }

    function _emitEvents(IERC20[] memory assets, uint256[] memory balancesBefore, address[] memory tokensOut) internal {
        uint256 amountAsset0After = assets[0].balanceOf(address(this));
        uint256 amountAsset1After = assets[1].balanceOf(address(this));

        if (amountAsset0After > 0) {
            assets[0].transfer(msg.sender, amountAsset0After);
        }

        if (amountAsset1After > 0) {
            assets[1].transfer(msg.sender, amountAsset1After);
        }

        uint256[] memory amountsPut = new uint256[](2);
        amountsPut[0] = balancesBefore[0] - amountAsset0After;
        amountsPut[1] = balancesBefore[1] - amountAsset1After;

        uint256[] memory amountsReturned = new uint256[](2);
        amountsReturned[0] = amountAsset0After;
        amountsReturned[1] = amountAsset1After;
        emit PutIntoPool(amountsPut, tokensOut);
        emit ReturnedToUser(amountsReturned, tokensOut);
    }

    function _addLiquidity(INFTPool gauge, address[] memory tokensOut, uint256[] memory tokensAmount) internal {        

        positionHelper.addLiquidityAndCreatePosition(
            tokensOut[0],
            tokensOut[1],
            tokensAmount[0],
            tokensAmount[1],
            OvnMath.subBasisPoints(tokensAmount[0], stakeSlippageBP),
            OvnMath.subBasisPoints(tokensAmount[1], stakeSlippageBP),
            block.timestamp,
            address(this),
            gauge,
            0
        );
        gauge.safeTransferFrom(address(this), address(msg.sender), gauge.lastTokenId());
    }

    function getAmountToSwap(
        uint256 amount0,
        uint256 amount1,
        uint256 reserve0,
        uint256 reserve1,
        uint256 denominator0,
        uint256 denominator1
    ) internal pure returns (uint256[] memory newAmounts) {
        newAmounts = new uint256[](2);
        if ((reserve0 * 100) / denominator0 > (reserve1 * 100) / denominator1) {
            newAmounts[1] = (reserve1 * amount0) / reserve0;
            // 18 + 6 - 6
            newAmounts[1] = newAmounts[1] > amount1 ? amount1 : newAmounts[1];
            newAmounts[0] = (newAmounts[1] * reserve0) / reserve1;
            // 18 + 6 - 18
        } else {
            newAmounts[0] = (reserve0 * amount1) / reserve1;
            newAmounts[0] = newAmounts[0] > amount0 ? amount0 : newAmounts[0];
            newAmounts[1] = (newAmounts[0] * reserve1) / reserve0;
        }
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
