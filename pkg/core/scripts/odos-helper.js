const axios = require("axios");
const BigNumber = require('bignumber.js');

async function getOdosSwapData(tokenIn, tokenOut, amountTokenIn) {

    let insurance = await ethers.getContract("InsuranceExchange");

    const inputToken = { "tokenAddress": tokenIn, "amount": amountTokenIn.toString() };
    const outputToken = { "tokenAddress": tokenOut, "proportion": 1 };

    const request = await getOdosRequest({
        "inputTokens": inputToken,
        "outputTokens": outputToken,
        "userAddr": insurance.address,
    });

    return {
            inputTokenAddress: tokenIn,
            outputTokenAddress: tokenOut,
            amountIn: amountTokenIn,
            data: request.transaction.data
        }
}

async function getOdosAmountOut(tokenIn, tokenOut, amountTokenIn, outDecimals) {

    let insurance = await ethers.getContract("InsuranceExchange");

    const inputToken = { "tokenAddress": tokenIn, "amount": amountTokenIn.toString() };
    const outputToken = { "tokenAddress": tokenOut, "proportion": 1 };

    const request = await getOdosRequest({
        "inputTokens": inputToken,
        "outputTokens": outputToken,
        "userAddr": insurance.address,
    });

    let out = new BigNumber((parseFloat(request.outValues[0]) * 10**outDecimals).toFixed(0));

    return out;
}

async function getOdosRequest(request) {
    let swapParams = {
        "chainId": 10, //await getChainId(),
        "gasPrice": 20,
        "inputTokens": [request.inputTokens],
        "outputTokens": [request.outputTokens],
        "userAddr": request.userAddr,
        "slippageLimitPercent": 1,
        "sourceBlacklist": ["Hashflow"],
        "sourceWhitelist": [],
        "simulate": false,
        "pathViz": false,
        "disableRFQs": false
    }

    // console.log("swapParams", swapParams);

    // @ts-ignore
    const urlQuote = 'https://api.overnight.fi/root/odos/sor/quote/v2';
    const urlAssemble = 'https://api.overnight.fi/root/odos/sor/assemble';
    let transaction;
    try {
        let quotaResponse = (await axios.post(urlQuote, swapParams, { headers: { "Accept-Encoding": "br" } }));

        let assembleData = {
            "userAddr": request.userAddr,
            "pathId": quotaResponse.data.pathId,
            "simulate": false
        }

        // console.log("assembleData: ", assembleData)
        transaction = (await axios.post(urlAssemble, assembleData, { headers: { "Accept-Encoding": "br" } }));
        // console.log("odos transaction simulation: ", transaction.data.simulation)
    } catch (e) {
        console.log("[zap] getSwapTransaction: ", e);
        return 0;
    }

    if (transaction.statusCode === 400) {
        console.log(`[zap] ${transaction.description}`);
        return 0;
    }

    if (transaction.data.transaction === undefined) {
        console.log("[zap] transaction.tx is undefined");
        return 0;
    }

    console.log('Success get data from Odos!');
    return transaction.data;
}

module.exports = {
    getOdosSwapData: getOdosSwapData,
    getOdosAmountOut: getOdosAmountOut,
    getOdosRequest: getOdosRequest
}