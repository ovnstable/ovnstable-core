const {default: axios} = require("axios");
const {ethers} = require("hardhat");
const INCH_ROUTER_V5 = require("@overnight-contracts/core/test/abi/InchRouterV5.json");

async function getDataForSwap(chainId,
                              strategyAddress,
                              tokenIn,
                              tokenOut,
                              amountIn,
                              protocols = "",
                              connectors = "") {


    const swapParams = {
        fromTokenAddress: tokenIn,
        toTokenAddress: tokenOut,
        amount: amountIn,
        fromAddress: strategyAddress,
        destReceiver: strategyAddress,
        slippage: "15",
        disableEstimate: "true",
        allowPartialFill: "false",
        protocols: protocols,
        connectorTokens: connectors,
        usePatching: "true"
    };

    let baseUrl = 'https://api-overnight.1inch.io/v5.0';

    const url = `${baseUrl}/${chainId}/swap?` + (new URLSearchParams(swapParams)).toString();

    console.log('[InchService] Request url: ' + url);

    const response = await axios.get(url, { headers: { "Accept-Encoding": "br" } });

    return getArgs(response);
}

function getArgs(transaction) {

    let decodedData;
    try {

        let iface = new ethers.utils.Interface(INCH_ROUTER_V5);

        decodedData = iface.parseTransaction({ data: transaction.data.tx.data, value: transaction.data.tx.value });
    } catch (e) {
        console.error("[InchService] decodedData error: " + e);
        return 0;
    }

    let args;

    console.log(decodedData);

    args = {
        flags: decodedData.args.desc.flags,
        data: decodedData.args.data,
        srcReceiver: decodedData.args.desc.srcReceiver
    }
    return args;
}

module.exports = {
    getDataForSwap: getDataForSwap,
    getArgs: getArgs
}
