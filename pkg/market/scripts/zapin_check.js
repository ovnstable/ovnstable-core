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
    console.log("block:", await ethers.provider.getBlockNumber());

    // let params = {
    //     name: 'AerodromeCLZap',
    //     pair: '0x7e928afb59f5dE9D2f4d162f754C6eB40c88aA8E',
    //     token0In: 'usdc',
    //     token1In: 'usdPlus',
    //     token0Out: 'usdc',
    //     token1Out: 'usdt',
    //     priceRange: [0.989, 1.10001],
    //     tickDelta: '0'
    // };

    // let params = {
    //     name: 'AerodromeCLZap',
    //     pair: '0x20086910E220D5f4c9695B784d304A72a0de403B',
    //     token0In: 'usdc',
    //     token1In: 'usdPlus',
    //     token0Out: 'usdPlus',
    //     token1Out: 'usdbc',
    //     priceRange: [0.989, 1.10001],
    //     tickDelta: '0'
    // };

    let params = {
            name: 'AerodromeCLZap',
            pair: '0x4D69971CCd4A636c403a3C1B00c85e99bB9B5606',
            token0Out: 'weth',
            token1Out: 'usdPlus',
            token0In: 'sfrax',
            token1In: 'dai',
            priceRange: [3600, 4200],
        tickDelta: '0'
        };

    // let params = {
    //     name: 'PancakeCLZap',
    //     pair: '0xe37304f7489ed253b2a46a1d9dabdca3d311d22e',
    //     token0In: 'usdtPlus',
    //     token1In: 'usdPlus',
    //     token0Out: 'weth',
    //     token1Out: 'usdPlus',
    //     priceRange: [3321, 4059],
    //     tickDelta: '0'
    // };

    let setUpParams = await setUp(params);

        console.log("setUp done successfully")

        account = setUpParams.account;
    token0In = setUpParams.token0In;
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
        const amountToken1Out = toToken1Out(0);
        // const amountToken1In = toToken1Out(0.001);

    await (await token0In.approve(zap.address, toE18(10000))).wait();
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
        inputTokensDecimals: [6],
            inputTokensAddresses: ['0xb1084db8d3c05cebd5fa9335df95ee4b8a0edc30'],
            inputTokensAmounts: [1000000],
            inputTokensPrices: [3671],
        // inputTokensPrices: [await getOdosAmountOutOnly(token0In, dai, token0InDec, account.address), await getOdosAmountOutOnly(token1In, dai, token1InDec, account.address)],
        outputTokensDecimals: [token0OutDec, token1OutDec],
        outputTokensAddresses: [token0Out.address, token1Out.address],
        outputTokensAmounts: [amountToken0Out, amountToken1Out],
        outputTokensPrices: [3671, 1],
        proportion0: reserves[0] * price / sumReserves
    })
    return;

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

        // console.log(inputTokens, outputTokens, request.data, [proportions.amountToken0Out, proportions.amountToken1Out], params);

        console.log("END")

    let swapData = {
        inputs: inputTokens,
        outputs: outputTokens,
        data: request.data
    };
    let pancakeData = {
        amountsOut: [proportions.amountToken0Out, proportions.amountToken1Out],
        ...params,
    };
    console.log(swapData, pancakeData);
    let receipt = await (await zap.connect(account).zapIn(
        swapData,
        pancakeData,
    )).wait();

    const inputTokensEvent = receipt.events.find((event) => event.event === "InputTokens");
    const outputTokensEvent = receipt.events.find((event) => event.event === "OutputTokens");
    const putIntoPoolEvent = receipt.events.find((event) => event.event === "PutIntoPool");
    const returnedToUserEvent = receipt.events.find((event) => event.event === "ReturnedToUser");
    let mintEvent;

    if ('priceRange' in params) {
        mintEvent = receipt.events.find((event) => event.event === "IncreaseLiquidity");
    }

    console.log(`Input tokens: ${inputTokensEvent.args.amountsIn} ${inputTokensEvent.args.tokensIn}`);
    console.log(`Output tokens: ${outputTokensEvent.args.amountsOut} ${outputTokensEvent.args.tokensOut}`);
    console.log(`Tokens put into pool: ${putIntoPoolEvent.args.amountsPut} ${putIntoPoolEvent.args.tokensPut}`);
    console.log(`Tokens returned to user: ${returnedToUserEvent.args.amountsReturned} ${returnedToUserEvent.args.tokensReturned}`);

    expect(token0Out.address).to.equals(putIntoPoolEvent.args.tokensPut[0]);
    expect(token1Out.address).to.equals(putIntoPoolEvent.args.tokensPut[1]);

    expect(token0Out.address).to.equals(returnedToUserEvent.args.tokensReturned[0]);
    expect(token1Out.address).to.equals(returnedToUserEvent.args.tokensReturned[1]);

    // 1) tokensPut в пределах границы согласно пропорциям внутри пула:
    const proportion0 = reserves[0] / reserves[0].add(reserves[1]);
    const proportion1 = reserves[1] / reserves[0].add(reserves[1]);
    const putTokenAmount0 = fromToken0Out(putIntoPoolEvent.args.amountsPut[0]);
    const putTokenAmount1 = fromToken1Out(putIntoPoolEvent.args.amountsPut[1]);

    console.log(proportion0, proportion1, putTokenAmount0, putTokenAmount1);

    console.log("prop0: ", proportion0);
    console.log("prop1: ", putTokenAmount0 / (putTokenAmount0 + putTokenAmount1));
    expect(Math.abs(proportion0 - putTokenAmount0 / (putTokenAmount0 + putTokenAmount1))).to.lessThan(0.05);
    expect(Math.abs(proportion1 - putTokenAmount1 / (putTokenAmount0 + putTokenAmount1))).to.lessThan(0.05);

    expect(fromToken0Out(await token0Out.balanceOf(zap.address))).to.lessThan(1);
    expect(fromToken1Out(await token1Out.balanceOf(zap.address))).to.lessThan(1);
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
    console.log("calculateProportionForPool:");
    console.log(
        inputTokensDecimals,
        inputTokensAddresses,
        inputTokensAmounts,
        inputTokensPrices,
        outputTokensDecimals,
        outputTokensAddresses,
        outputTokensAmounts,
        outputTokensPrices,
        proportion0
    );
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
        token0In: (await getERC20(params.token0In)).connect(account),
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

    console.log("odos request:", swapParams);

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
