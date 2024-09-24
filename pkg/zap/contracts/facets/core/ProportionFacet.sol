//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "../../interfaces/IMasterFacet.sol";
import "../../interfaces/Constants.sol";

contract ProportionFacet is IProportionFacet {

    struct OutTokenInfo {
        uint256 idx;
        uint256 amount;
        uint256 amountUsd;
        uint256 prop;
        uint256 propAmount;
        uint256 amountToSwap;
        uint256 outAmount;
        address token;
    }

    function getProportionForZap(
        address pair,
        int24[] memory tickRange,
        InputSwapToken[] memory inputTokens
    ) external view returns (ResultOfProportion memory result) {
        IMasterFacet master = IMasterFacet(address(this));
        isValid(pair, tickRange, inputTokens);

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

        // extract pool tokens from input and calculate total input amount in USD
        for (uint256 i = 0; i < inputTokens.length; i++) {
            decimals[i] = IERC20Metadata(inputTokens[i].tokenAddress).decimals();
            // prices are in 18 decimals
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
            // these tokens are not part of the pool and will be used for swap
            result.inputTokenAddresses[i] = inputTokens[i].tokenAddress;
            result.inputTokenAmounts[i] = inputTokens[i].amount;
        }

        // calculate the proportion of the pool tokens in USD
        (outTokens[0].propAmount, outTokens[1].propAmount) = getProportion(pair, tickRange);
        outTokens[0].prop = outTokens[0].propAmount * master.getCurrentPrice(pair);
        outTokens[1].prop = outTokens[0].prop + outTokens[1].propAmount * (10 ** IERC20Metadata(outTokens[1].token).decimals());
        result.poolProportionsUsd[0] = master.mulDiv(sumInputsUsd, outTokens[0].prop, outTokens[1].prop);
        result.poolProportionsUsd[1] = sumInputsUsd - result.poolProportionsUsd[0];

        for (uint256 i = 0; i < 2; i++) {
            uint256 j = outTokens[i].idx;
            // if the amount of pool token exceeds the required amount we need to swap
            if (j < inputTokens.length && result.poolProportionsUsd[i] < outTokens[i].amountUsd) {
                // swap the exceeded amount
                outTokens[i].amountToSwap = master.mulDiv(outTokens[i].amountUsd - result.poolProportionsUsd[i], 10 ** decimals[j], inputTokens[j].price);
                result.inputTokenAddresses[j] = inputTokens[j].tokenAddress;
                result.inputTokenAmounts[j] = outTokens[i].amountToSwap;

                // we need another token in full amount
                result.outputTokenAddresses[0] = outTokens[1 - i].token;
                result.outputTokenProportions[0] = BASE_DIV;
                // amount of tokens come directly into pool (without swap)
                result.outputTokenAmounts[i] = inputTokens[j].amount - outTokens[i].amountToSwap;
                result.outputTokenAmounts[1 - i] = outTokens[1 - i].idx < inputTokens.length ? inputTokens[outTokens[1 - i].idx].amount : 0;
                return result;
            }
        }

        // both token amounts are less than required, put both directly into pool (without swap)
        result.outputTokenAddresses[0] = outTokens[0].token;
        result.outputTokenAddresses[1] = outTokens[1].token;
        // proportion of pool +/- direct transfer amount
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

    function isValid(address pair, int24[] memory tickRange, InputSwapToken[] memory inputTokens) internal view {
        IMasterFacet master = IMasterFacet(address(this));
        require(master.isValidPool(pair), "Pool address in not valid");
        require(tickRange.length == 2, "Invalid tick range length, must be exactly 2");
        require(tickRange[0] < tickRange[1], "Invalid tick range");

        for (uint256 i = 0; i < inputTokens.length; i++) {
            require(inputTokens[i].tokenAddress != address(0), "Invalid token address");
            require(inputTokens[i].amount > 0, "Amount is 0");
            require(inputTokens[i].price > 0, "Price is 0");
        }
    }
}
