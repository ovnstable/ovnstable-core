const { expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const {
    transferAsset,
    getERC20,
    transferETH,
    initWallet,
    execTimelock,
    getContract,
    getChainId
} = require("@overnight-contracts/common/utils/script-utils");
const { resetHardhat, greatLess, resetHardhatToLastBlock } = require("@overnight-contracts/common/utils/tests");
const BN = require("bn.js");
const hre = require("hardhat");
const { sharedBeforeEach } = require("@overnight-contracts/common/utils/sharedBeforeEach");
const { toE6, fromE6, fromE18, toAsset, toE18 } = require("@overnight-contracts/common/utils/decimals");
const axios = require("axios");
const { default: BigNumber } = require("bignumber.js");
const { getOdosAmountOut, getOdosSwapData } = require("@overnight-contracts/common/utils/odos-helper");
const { getOdosAmountOutOnly } = require("@overnight-contracts/common/utils/odos-helper.js");

async function main() {
    let zap = await getContract('AerodromeCLZap');

    let params = {
        name: 'AerodromeCLZap',
        pair: '0x96331Fcb46A7757854d9E26AFf3aCA2815D623fD',
        token0Out: 'dola',
        token1Out: 'usdPlus',
        token0In: 'sfrax',
        token1In: 'dai',
        priceRange: [100, 4000],
        tickDelta: '1'
    };

    let setUpParams = await setUp(params);

        console.log("setUp done successfully")

        account = setUpParams.account;
        token0Out = setUpParams.token0Out;
        token1Out = setUpParams.token1Out;
        


        console.log("token0", token0Out.address);
        token0OutDec = await token0Out.decimals();
        console.log("token0OutDec:", token0OutDec);

        console.log("token1", token1Out.address);
        token1OutDec = await token1Out.decimals();
        

        // console.log(token0InDec, token1InDec, token0OutDec, token1OutDec);

        toToken0Out = token0OutDec == 6 ? toE6 : toE18;
        toToken1Out = token1OutDec == 6 ? toE6 : toE18;
        // toToken1In = token1InDec == 6 ? toE6 : toE18;

        fromToken0Out = token0OutDec == 6 ? fromE6 : fromE18;
        fromToken1Out = token1OutDec == 6 ? fromE6 : fromE18;
        // fromToken1In = token1InDec == 6 ? fromE6 : fromE18;

        if ('priceRange' in params) { 
            curPriceRange = [...params.priceRange];

            curPriceRange[0] = Math.ceil(toE6(curPriceRange[0])).toString();
            curPriceRange[1] = Math.ceil(toE6(curPriceRange[1])).toString();

            console.log("priceRange[0]: ", Math.ceil(Math.sqrt(curPriceRange[0])));
            console.log("priceRange[1]: ", Math.ceil(Math.sqrt(curPriceRange[1])));
            console.log("priceRange: ", curPriceRange);

            params.priceRange = [...curPriceRange];
        }
        
        const amountToken0Out = toToken0Out(0);
        const amountToken1Out = toToken1Out(0.01);
        // const amountToken1In = toToken1Out(0.001);
        

        await (await token0Out.approve(zap.address, toE18(10000))).wait();
        await (await token1Out.approve(zap.address, toE18(10000))).wait();

        let reserves;
        if ('priceRange' in params) {
            // params.priceRange[0] = toToken0Out(params.priceRange[0]);
            // params.priceRange[1] = toToken1Out(params.priceRange[1]);

            reserves = await zap.getProportion({amountsOut: [], ...params});
        } else if ('pair' in params) {
            reserves = await zap.getProportion(params.pair);
        } else if ('poolId' in params) {
            reserves = await zap.getProportion(params.gauge, params.poolId);
        } else {
            reserves = await zap.getProportion(params.gauge);
        }

        price = fromE6(await zap.getCurrentPrice(params.pair)).toFixed(0).toString();
        console.log(price);

        const sumReserves = (reserves[0]).mul(price).add(reserves[1]);

        console.log("sumReserves: ", sumReserves);
        console.log("reserve0: ", reserves[0].toString());
        console.log("reserve0 with price: ", reserves[0] * price);
        console.log("reserve1: ", reserves[1].toString());
        

        console.log("prop: ", reserves[0] / sumReserves);
        console.log("prop with price: ", ((reserves[0]).mul(price).div(sumReserves)).toString());



    const proportions = calculateProportionForPool({
        inputTokensDecimals: [],
            inputTokensAddresses: [],
            inputTokensAmounts: [],
            inputTokensPrices: [],
        // inputTokensPrices: [await getOdosAmountOutOnly(token0In, dai, token0InDec, account.address), await getOdosAmountOutOnly(token1In, dai, token1InDec, account.address)],
        outputTokensDecimals: [token0OutDec, token1OutDec],
        outputTokensAddresses: [token0Out.address, token1Out.address],
        outputTokensAmounts: [amountToken0Out, amountToken1Out],
        outputTokensPrices: [3748, 1],
        proportion0: reserves[0] * price / sumReserves
    })

    const request = await getOdosRequest({
        "inputTokens": proportions.inputTokens,
        "outputTokens": proportions.outputTokens,
        "userAddr": zap.address,
    });

    const inputTokens = proportions.inputTokens.map(({ tokenAddress, amount }) => {
        return { "tokenAddress": tokenAddress, "amountIn": amount };
    });
    const outputTokens = proportions.outputTokens.map(({ tokenAddress }) => {
        return { "tokenAddress": tokenAddress, "receiver": zap.address };
    });

    console.log("St")

        console.log(inputTokens, outputTokens, request.data, [proportions.amountToken0Out, proportions.amountToken1Out], params);

        console.log("END")

    let receipt = await (await zap.connect(account).zapIn(
        {
            inputs: inputTokens,
            outputs: outputTokens,
            data: request.data
        },
        {
            amountsOut: [proportions.amountToken0Out, proportions.amountToken1Out],
            ...params,
        }, 
    )).wait();
}

function calculateProportionForPool(
    {
        inputTokensDecimals,
        inputTokensAddresses,
        inputTokensAmounts,
        inputTokensPrices,
        outputTokensDecimals,
        outputTokensAddresses,
        outputTokensAmounts,
        outputTokensPrices,
        proportion0,
    }
) {
    const tokenOut0 = Number.parseFloat(new BigNumber(outputTokensAmounts[0].toString()).div(new BigNumber(10).pow(outputTokensDecimals[0])).toFixed(3).toString()) * outputTokensPrices[0];
    const tokenOut1 = Number.parseFloat(new BigNumber(outputTokensAmounts[1].toString()).div(new BigNumber(10).pow(outputTokensDecimals[1])).toFixed(3).toString()) * outputTokensPrices[1];
    const sumInitialOut = tokenOut0 + tokenOut1;
    let sumInputs = 0;
    for (let i = 0; i < inputTokensAmounts.length; i++) {
        sumInputs += Number.parseFloat(
            new BigNumber(inputTokensAmounts[i].toString())
                .div(new BigNumber(10).pow(inputTokensDecimals[i]))
                .toFixed(3)
                .toString()
        ) * inputTokensPrices[i];
    }
    sumInputs += sumInitialOut;

    const output0InMoneyWithProportion = sumInputs * proportion0;
    const output1InMoneyWithProportion = sumInputs * (1 - proportion0);

    console.log("base: ", tokenOut0, tokenOut1);
    console.log("baseprop: ", output0InMoneyWithProportion, output1InMoneyWithProportion);

    const inputTokens = inputTokensAddresses.map((address, index) => {
        return { "tokenAddress": address, "amount": inputTokensAmounts[index].toString() };
    });
    if (output0InMoneyWithProportion < tokenOut0) {
        console.log("A");
        const dif = tokenOut0 - output0InMoneyWithProportion;
        const token0AmountForSwap = new BigNumber((dif / outputTokensPrices[0]).toString()).times(new BigNumber(10).pow(outputTokensDecimals[0])).toFixed(0);
        inputTokens.push({ "tokenAddress": outputTokensAddresses[0], "amount": token0AmountForSwap.toString() })

        return {
            "outputTokens": [
                {
                    "tokenAddress": outputTokensAddresses[1],
                    "proportion": 1
                }
            ],
            "inputTokens": inputTokens,
            "amountToken0Out": (new BigNumber(outputTokensAmounts[0]).minus(token0AmountForSwap)).toFixed(0),
            "amountToken1Out": outputTokensAmounts[1].toString(),
        }

    } else if (output1InMoneyWithProportion < tokenOut1) {
        console.log("B");
        const dif = (tokenOut1 - output1InMoneyWithProportion);
        console.log("dif: ", dif);
        console.log("dif / dec: ", new BigNumber((dif / outputTokensPrices[1]).toString()));
        
        const token1AmountForSwap = new BigNumber((dif / outputTokensPrices[1]).toString()).times(new BigNumber(10).pow(outputTokensDecimals[1])).toFixed(0);
        
        console.log("token1AmountForSwap: ", token1AmountForSwap);
        
        inputTokens.push({ "tokenAddress": outputTokensAddresses[1], "amount": token1AmountForSwap.toString() })

        return {
            "outputTokens": [
                {
                    "tokenAddress": outputTokensAddresses[0],
                    "proportion": 1
                },
            ],
            "inputTokens": inputTokens,
            "amountToken0Out": outputTokensAmounts[0].toString(),
            "amountToken1Out": (new BigNumber(outputTokensAmounts[1]).minus(token1AmountForSwap)).toFixed(0),
        }

    } else if (output1InMoneyWithProportion === tokenOut1 && output0InMoneyWithProportion === tokenOut0 && (proportion0 === 1 || proportion0 === 0)) {
        return {
            "outputTokens": [],
            "inputTokens": [],
            "amountToken0Out": outputTokensAmounts[0].toString(),
            "amountToken1Out": outputTokensAmounts[1].toString()
        }
    } else {

        const difToGetFromOdos0 = output0InMoneyWithProportion - tokenOut0;
        const difToGetFromOdos1 = output1InMoneyWithProportion - tokenOut1;

        return {
            "inputTokens": inputTokens,
            "outputTokens": [
                {
                    "tokenAddress": outputTokensAddresses[0],
                    "proportion": Number.parseFloat((difToGetFromOdos0 / (difToGetFromOdos0 + difToGetFromOdos1)).toFixed(2))
                },
                {
                    "tokenAddress": outputTokensAddresses[1],
                    "proportion": Number.parseFloat((difToGetFromOdos1 / (difToGetFromOdos0 + difToGetFromOdos1)).toFixed(2))
                },
            ],
            "amountToken0Out": new BigNumber((tokenOut0 / outputTokensPrices[0]).toString()).times(new BigNumber(10).pow(outputTokensDecimals[0])).toFixed(0),
            "amountToken1Out": new BigNumber((tokenOut1 / outputTokensPrices[1]).toString()).times(new BigNumber(10).pow(outputTokensDecimals[1])).toFixed(0),
        }
    }
}

async function setUp(params) {

    const signers = await ethers.getSigners();
    const account = signers[0];

    let usdc;
    if (process.env.STAND === 'base') {
        usdc = await getERC20('usdbc');
    } else {
        usdc = await getERC20('usdc');
    }

    


    return {
        account: account,
        token0Out: (await getERC20(params.token0Out)).connect(account),
        token1Out: (await getERC20(params.token1Out)).connect(account)
    }
}

async function getOdosRequest(request) {
    let swapParams = {
        "chainId": await getChainId(),
        "gasPrice": 1,
        "inputTokens": request.inputTokens,
        "outputTokens": request.outputTokens,
        "userAddr": request.userAddr,
        "slippageLimitPercent": 1,
        "sourceBlacklist": ["Hashflow", "Overnight Exchange"],
        "sourceWhitelist": [],
        "simulate": false,
        "pathViz": false,
        "disableRFQs": false
    }

    // @ts-ignore
    const urlQuote = 'https://api.overnight.fi/root/odos/sor/quote/v2';
    const urlAssemble = 'https://api.overnight.fi/root/odos/sor/assemble';
    let transaction;
    try {
        let quotaResponse = (await axios.post(urlQuote, swapParams, { headers: { "Accept-Encoding": "br" } }));

        let assembleData = {
            "userAddr": request.userAddr,
            "pathId": quotaResponse.data.pathId,
            "simulate": true
        }

        // console.log("assembleData: ", assembleData)
        transaction = (await axios.post(urlAssemble, assembleData, { headers: { "Accept-Encoding": "br" } }));
        // console.log('trans: ', transaction, quotaResponse);
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
    return transaction.data.transaction;
}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
