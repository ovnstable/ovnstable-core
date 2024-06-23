// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./OdosZap.sol";
import "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";

contract AerodromeCLProportionsZap {
    struct InputSwapToken {
        address tokenAddress;
        uint256 amount;
        uint256 price;
    }

    struct ResultOfProportion {
        address[] inputTokenAddresses;
        uint256[] inputTokenAmounts;
        address[] outputTokenAddresses;
        uint256[] outputTokenProportions;
        uint256[] outputTokenAmounts;
    }

    struct OutTokenInfo {
        uint256 idx;
        uint256 amount;
        uint256 prop;
        uint256 sumProp;
        uint256 propAmount;
        uint256 amountToSwap;
        uint256 decimals;
        uint160 sqrtRatio;
    }

    function _getProportionForZap(address pair, int24[] memory tickRange, InputSwapToken[] memory inputTokens)
            internal view returns (ResultOfProportion memory) {
        IUniswapV3Pool pool = IUniswapV3Pool(pair);
        IERC20Metadata[] memory tokens = new IERC20Metadata[](inputTokens.length);
        OutTokenInfo[] memory outTokens = new OutTokenInfo[](2);
        uint256 sumInputs;
        uint256 denominator;
        uint256 i;
        ResultOfProportion memory result;

        outTokens[0].idx = inputTokens.length;
        outTokens[1].idx = inputTokens.length;
        outTokens[0].decimals = 10 ** IERC20Metadata(pool.token0()).decimals();
        outTokens[1].decimals = 10 ** IERC20Metadata(pool.token1()).decimals();

        for (i = 0; i < inputTokens.length; i++) {
            tokens[i] = IERC20Metadata(inputTokens[i].tokenAddress);
            if (denominator < tokens[i].decimals()) {
                denominator = tokens[i].decimals();
            }
            if (inputTokens[i].tokenAddress == pool.token0()) {
                outTokens[0].idx = i;
            } else if (inputTokens[i].tokenAddress == pool.token1()) {
                outTokens[1].idx = i;
            }
        }
        uint256 usdAmount;
        for (i = 0; i < inputTokens.length; i++) {
            usdAmount = inputTokens[i].price * inputTokens[i].amount * 10 ** (denominator - tokens[i].decimals());
            sumInputs += usdAmount;
            if (outTokens[0].idx == i) {
                outTokens[0].amount = usdAmount;
            } else if (outTokens[1].idx == i) {
                outTokens[0].amount = usdAmount;
            }
        }

//        console.log("sumInputs", sumInputs);
        (uint160 sqrtRatioX96,,,,,) = pool.slot0();
        outTokens[0].sqrtRatio = TickMath.getSqrtRatioAtTick(tickRange[0]);
        outTokens[1].sqrtRatio = TickMath.getSqrtRatioAtTick(tickRange[1]);
        (outTokens[0].propAmount, outTokens[1].propAmount) = LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, outTokens[0].sqrtRatio, outTokens[1].sqrtRatio,
            LiquidityAmounts.getLiquidityForAmounts(sqrtRatioX96, outTokens[0].sqrtRatio, outTokens[1].sqrtRatio, outTokens[0].decimals * 1000, outTokens[1].decimals * 1000));

        outTokens[0].propAmount = outTokens[0].propAmount * ((outTokens[0].decimals > outTokens[1].decimals ? outTokens[0].decimals : outTokens[1].decimals) / outTokens[0].decimals);
        outTokens[1].propAmount = outTokens[1].propAmount * ((outTokens[0].decimals > outTokens[1].decimals ? outTokens[0].decimals : outTokens[1].decimals) / outTokens[1].decimals);
//        console.log("token0Amount, token1Amount", outTokens[0].propAmount, outTokens[1].propAmount);
//        console.log("currentPrice", _getCurrentPrice(pair));
        outTokens[0].prop = outTokens[0].propAmount * _getCurrentPrice(pair);
        outTokens[1].prop = outTokens[0].prop + outTokens[1].propAmount * outTokens[0].decimals;
//        console.log("prop", outTokens[0].prop, outTokens[1].prop);
        outTokens[0].sumProp = FullMath.mulDiv(sumInputs, outTokens[0].prop, outTokens[1].prop);
        outTokens[1].sumProp = sumInputs - outTokens[0].sumProp;
//        console.log("outputInMoneyWithProportion", outTokens[0].sumProp, outTokens[1].sumProp);
//        console.log("tokenOut", outTokens[0].amount, outTokens[1].amount);

        result.inputTokenAddresses = new address[](inputTokens.length);
        result.inputTokenAmounts = new uint256[](inputTokens.length);
        result.outputTokenAddresses = new address[](2);
        result.outputTokenProportions = new uint256[](2);
        result.outputTokenAmounts = new uint256[](2);

        for (i = 0; i < inputTokens.length; i++) {
            if (outTokens[0].idx != i && outTokens[1].idx != i) {
                result.inputTokenAddresses[i] = inputTokens[i].tokenAddress;
                result.inputTokenAmounts[i] = inputTokens[i].amount;
            }
            else if (outTokens[0].idx == i && outTokens[0].sumProp < outTokens[0].amount) {
                outTokens[0].amountToSwap = (outTokens[0].amount - outTokens[0].sumProp) /
                    (inputTokens[outTokens[0].idx].price * 10 ** (denominator - tokens[outTokens[0].idx].decimals()));
                result.inputTokenAddresses[i] = inputTokens[i].tokenAddress;
                result.inputTokenAmounts[i] = outTokens[0].amountToSwap;
            }
            else if (outTokens[1].idx == i && outTokens[1].sumProp < outTokens[1].amount) {
                outTokens[1].amountToSwap = (outTokens[1].amount - outTokens[1].sumProp) /
                    (inputTokens[outTokens[1].idx].price * 10 ** (denominator - tokens[outTokens[1].idx].decimals()));
                result.inputTokenAddresses[i] = inputTokens[i].tokenAddress;
                result.inputTokenAmounts[i] = outTokens[1].amountToSwap;
            }
        }
        if (outTokens[0].idx < inputTokens.length && outTokens[0].sumProp < outTokens[0].amount) {
            result.outputTokenAddresses[0] = pool.token1();
            result.outputTokenProportions[0] = outTokens[0].decimals;
            result.outputTokenAmounts[0] = inputTokens[outTokens[0].idx].amount - outTokens[0].amountToSwap;
            result.outputTokenAmounts[1] = outTokens[1].idx < inputTokens.length ? inputTokens[outTokens[1].idx].amount : 0;
        }
        else if (outTokens[1].idx < inputTokens.length && outTokens[1].sumProp < outTokens[1].amount) {
            result.outputTokenAddresses[0] = pool.token0();
            result.outputTokenProportions[0] = outTokens[0].decimals;
            result.outputTokenAmounts[0] = inputTokens[outTokens[1].idx].amount - outTokens[1].amountToSwap;
            result.outputTokenAmounts[1] = outTokens[0].idx < inputTokens.length ? inputTokens[outTokens[0].idx].amount : 0;
        }
        else if (outTokens[0].idx < inputTokens.length &&
                outTokens[0].sumProp == outTokens[0].amount &&
                outTokens[1].idx < inputTokens.length &&
                outTokens[1].sumProp == outTokens[1].amount &&
                (outTokens[0].prop == 0 || outTokens[0].prop == outTokens[1].prop)) {
            for (i = 0; i < inputTokens.length; i++) {
                result.inputTokenAddresses[i] = address(0);
                result.inputTokenAmounts[i] = 0;
                if (i < 2) {
                    result.outputTokenAddresses[i] = address(0);
                    result.outputTokenProportions[i] = 0;
                }
            }
            result.outputTokenAmounts[0] = outTokens[0].idx < inputTokens.length ? inputTokens[outTokens[0].idx].amount : 0;
            result.outputTokenAmounts[1] = outTokens[1].idx < inputTokens.length ? inputTokens[outTokens[1].idx].amount : 0;
        }
        else {
            result.outputTokenAddresses[0] = pool.token0();
            result.outputTokenAddresses[1] = pool.token1();
            result.outputTokenProportions[0] = FullMath.mulDiv(outTokens[0].sumProp - outTokens[0].amount, outTokens[0].decimals,
                (outTokens[0].sumProp + outTokens[1].sumProp) - (outTokens[0].amount + outTokens[1].amount));
            result.outputTokenProportions[1] = FullMath.mulDiv(outTokens[1].sumProp - outTokens[1].amount, outTokens[0].decimals,
                (outTokens[0].sumProp + outTokens[1].sumProp) - (outTokens[0].amount + outTokens[1].amount));
            result.outputTokenAmounts[0] = outTokens[0].amount /
                (inputTokens[outTokens[0].idx].price * 10 ** (denominator - tokens[outTokens[0].idx].decimals()));
            result.outputTokenAmounts[1] = outTokens[1].amount /
                (inputTokens[outTokens[1].idx].price * 10 ** (denominator - tokens[outTokens[1].idx].decimals()));
        }
        return result;
    }

    function _getCurrentPrice(address pair) public view returns (uint256) {
        IUniswapV3Pool pool = IUniswapV3Pool(pair);
        uint256 dec0 = IERC20Metadata(pool.token0()).decimals();
        (uint160 sqrtRatioX96,,,,,) = pool.slot0();
        return FullMath.mulDiv(uint256(sqrtRatioX96) * 10 ** dec0, uint256(sqrtRatioX96), 2 ** (96 + 96));
    }
}