//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "../../interfaces/IMasterFacet.sol";
import "../../interfaces/Constants.sol";

contract ProportionFacet is IProportionFacet {
    function getProportionForZap(
        address pair,
        int24[] memory tickRange,
        InputSwapToken[] memory inputTokens,
        uint256 tokenId
    ) external view returns (ResultOfProportion memory result) {
        IMasterFacet master = IMasterFacet(address(this));
        uint8[] memory decimals = new uint8[](inputTokens.length);
        OutTokenInfo[] memory outTokens = new OutTokenInfo[](2);
        uint256 sumInputsUsd;

        outTokens[0].idx = inputTokens.length;
        outTokens[1].idx = inputTokens.length;
        (outTokens[0].token, outTokens[1].token) = master.getPoolTokens(pair);

        result.inputTokenAddresses = new address[](inputTokens.length);
        result.inputTokenAmounts = new uint256[](inputTokens.length);
        result.outputTokenAddresses = new address[](2);
        result.outputTokenProportions = new uint256[](2);
        result.outputTokenAmounts = new uint256[](2);
        result.poolProportionsUsd = new uint256[](2);

        for (uint256 i = 0; i < inputTokens.length; i++) {
            decimals[i] = IERC20Metadata(inputTokens[i].tokenAddress).decimals();
            uint256 amountUsd = master.mulDiv(inputTokens[i].price, inputTokens[i].amount, 10 ** decimals[i]);
            sumInputsUsd += amountUsd;
            if (inputTokens[i].tokenAddress == outTokens[0].token) {
                outTokens[0].idx = i;
                outTokens[0].amountUsd = amountUsd;
                continue;
            }
            if (inputTokens[i].tokenAddress == outTokens[1].token) {
                outTokens[1].idx = i;
                outTokens[1].amountUsd = amountUsd;
                continue;
            }
            // front (!)
            result.inputTokenAddresses[i] = inputTokens[i].tokenAddress;
            result.inputTokenAmounts[i] = inputTokens[i].amount;
        }

        if (tokenId == 0) {
            (outTokens[0].propAmount, outTokens[1].propAmount) = getProportion(pair, tickRange);
        } else {
            (outTokens[0].propAmount, outTokens[1].propAmount) = master.getPositionAmounts(tokenId);
        }
        outTokens[0].prop = outTokens[0].propAmount * master.getCurrentPrice(pair);
        outTokens[1].prop = outTokens[0].prop + outTokens[1].propAmount * (10 ** IERC20Metadata(outTokens[1].token).decimals());
        result.poolProportionsUsd[0] = master.mulDiv(sumInputsUsd, outTokens[0].prop, outTokens[1].prop);
        result.poolProportionsUsd[1] = sumInputsUsd - result.poolProportionsUsd[0];

        if (result.poolProportionsUsd[0] == outTokens[0].amountUsd && result.poolProportionsUsd[1] == outTokens[1].amountUsd &&
            (outTokens[0].prop == 0 || outTokens[0].prop == outTokens[1].prop)) {
            delete result.inputTokenAddresses;
            delete result.inputTokenAmounts;
            result.outputTokenAmounts[0] = outTokens[0].idx < inputTokens.length ? inputTokens[outTokens[0].idx].amount : 0;
            result.outputTokenAmounts[1] = outTokens[1].idx < inputTokens.length ? inputTokens[outTokens[1].idx].amount : 0;
            return result;
        }

        for (uint256 i = 0; i < 2; i++) {
            if (outTokens[i].idx < inputTokens.length && result.poolProportionsUsd[i] < outTokens[i].amountUsd) {
                outTokens[i].amountToSwap = master.mulDiv(outTokens[i].amountUsd - result.poolProportionsUsd[i], 10 ** decimals[outTokens[i].idx], inputTokens[outTokens[i].idx].price);
                result.inputTokenAddresses[outTokens[i].idx] = inputTokens[outTokens[i].idx].tokenAddress;
                result.inputTokenAmounts[outTokens[i].idx] = outTokens[i].amountToSwap;
                result.outputTokenAddresses[0] = outTokens[1 - i].token;
                // front (!)
                result.outputTokenProportions[0] = BASE_DIV;
                result.outputTokenAmounts[i] = inputTokens[outTokens[i].idx].amount - outTokens[i].amountToSwap;
                result.outputTokenAmounts[1 - i] = outTokens[1 - i].idx < inputTokens.length ? inputTokens[outTokens[1 - i].idx].amount : 0;
                return result;
            }
        }

        result.outputTokenAddresses[0] = outTokens[0].token;
        result.outputTokenAddresses[1] = outTokens[1].token;
        result.outputTokenProportions[0] = master.mulDiv(result.poolProportionsUsd[0] - outTokens[0].amountUsd, BASE_DIV,
            (result.poolProportionsUsd[0] + result.poolProportionsUsd[1]) - (outTokens[0].amountUsd + outTokens[1].amountUsd));
        result.outputTokenProportions[1] = BASE_DIV - result.outputTokenProportions[0];
        result.outputTokenAmounts[0] = outTokens[0].idx < inputTokens.length ? inputTokens[outTokens[0].idx].amount : 0;
        result.outputTokenAmounts[1] = outTokens[1].idx < inputTokens.length ? inputTokens[outTokens[1].idx].amount : 0;
        return result;
    }

    function getProportion(
        address pair,
        int24[] memory tickRange
    ) public override view returns (uint256 token0Amount, uint256 token1Amount) {
        IMasterFacet master = IMasterFacet(address(this));
        (uint256 decimals0, uint256 decimals1) = master.getPoolDecimals(pair);
        uint256 dec0 = 10 ** decimals0;
        uint256 dec1 = 10 ** decimals1;
        uint160 sqrtRatioX96 = master.getPoolSqrtRatioX96(pair);

        uint160 sqrtRatio0 = master.getSqrtRatioAtTick(tickRange[0]);
        uint160 sqrtRatio1 = master.getSqrtRatioAtTick(tickRange[1]);
        uint128 liquidity = master.getLiquidityForAmounts(sqrtRatioX96, sqrtRatio0, sqrtRatio1, dec0 * 1000, dec1 * 1000);
        (token0Amount, token1Amount) = master.getAmountsForLiquidity(sqrtRatioX96, sqrtRatio0, sqrtRatio1, liquidity);
        uint256 denominator = dec0 > dec1 ? dec0 : dec1;

        token0Amount = token0Amount * (denominator / dec0);
        token1Amount = token1Amount * (denominator / dec1);
    }

    function setOutputToken(
        InputSwapToken[] memory inputTokens,
        OutTokenInfo[] memory outTokens,
        ResultOfProportion memory result,
        uint256 i) internal pure {
        result.outputTokenAmounts[i] = outTokens[i].idx < inputTokens.length ? inputTokens[outTokens[i].idx].amount : 0;
    }
}
