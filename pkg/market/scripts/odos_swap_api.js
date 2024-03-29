const apiBaseUrl = 'https://api.odos.xyz/sor/swap';
const axios = require("axios");

class SwapRequest {
    inputTokens;
    outputTokens;
    userAddr;
    chainId;
    gasPrice;
    slippageLimitPercent;
}


async function getOdosRequest(request) {
    let swapParams = {
        chainId: request.chainId,
        inputTokens: request.inputTokens,
        outputTokens: request.outputTokens,
        gasPrice: request.gasPrice,
        userAddr: request.userAddr,
        slippageLimitPercent: request.slippageLimitPercent,
        sourceBlacklist: ["Hashflow"],
        sourceWhitelist: [],
        simulate: false,
        pathViz: false,
        disableRFQs: false
    }
    // {
    // "chainId": 10,
    // "inputTokens": [
    // {
    // "tokenAddress": "0x73cb180bf0521828d8849bc8CF2B920918e23032",
    // "amount": 183000000000
    // }
    // ],
    // "outputTokens": [
    // {
    // "tokenAddress": "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    // "proportion": 1
    // }
    // ],
    // "gasPrice": 20,
    // "userAddr": "0x47E2D28169738039755586743E2dfCF3bd643f86",
    // "slippageLimitPercent": 0.3,
    // "sourceBlacklist": ["Hashflow"],
    // "sourceWhitelist": [],
    // "simulate": false,
    // "pathViz": false,
    // "disableRFQs": false
    // }

    // @ts-ignore
    const url = apiBaseUrl;
    let transaction;
    try {
        transaction = (await axios.post(url, swapParams, { headers: { "Accept-Encoding": "br" } }));
    } catch (e) {
        console.log("[odosSwap] getSwapTransaction: " + e);
        return 0;
    }

    if (transaction.statusCode === 400) {
        console.log(`[odosSwap]  ${transaction.description}`);
        return 0;
    }

    if (transaction.data.tx === undefined) {
        console.log("[odosSwap] transaction.tx is undefined");
        return 0;
    }

    return transaction.transaction;
}


async function main() {
    console.log(await getOdosRequest({
        "chainId": 10,
        "inputTokens": [
            {
                "tokenAddress": "0x73cb180bf0521828d8849bc8CF2B920918e23032",
                "amount": 183000000000
            }
        ],
        "outputTokens": [
            {
                "tokenAddress": "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
                "proportion": 1
            }
        ],
        "gasPrice": 20,
        "userAddr": "0x47E2D28169738039755586743E2dfCF3bd643f86",
        "slippageLimitPercent": 0.3,
    }))
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });