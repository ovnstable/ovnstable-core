const { expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const {
    transferAsset,
    getERC20,
    transferETH,
    initWallet,
    execTimelock,
    getContract
} = require("@overnight-contracts/common/utils/script-utils");
const { resetHardhat, greatLess, resetHardhatToLastBlock } = require("@overnight-contracts/common/utils/tests");
const BN = require("bn.js");
const hre = require("hardhat");
let { BASE } = require('@overnight-contracts/common/utils/assets');
const { sharedBeforeEach } = require("@overnight-contracts/common/utils/sharedBeforeEach");
const { toE6, fromE6, fromE18, toAsset, toE18 } = require("@overnight-contracts/common/utils/decimals");

const axios = require("axios");
const { default: BigNumber } = require("bignumber.js");

describe("BaseSwapZapper", function () {

    let baseSwapZap;

    let account;
    let usdPlus;
    let daiPlus;
    let usdc;
    let dai;

    let token0In;
    let token1In;

    let token0Out;
    let token1Out;

    const gauge = "0x2b0a43dccbd7d42c18f6a83f86d1a19fa58d541a";
    const poolId = 10;

    sharedBeforeEach('deploy and setup', async () => {
        await hre.run("compile");
        await resetHardhatToLastBlock();

        await deployments.fixture(['BaseSwapZap']);

        account = await setUp();
        baseSwapZap = await ethers.getContract("BaseSwapZap");

        token0Out = (await getContract('UsdPlusToken', 'base')).connect(account);
        token1Out = (await getERC20("usdbc")).connect(account);

        token0In = (await getContract('UsdPlusToken', 'base_dai')).connect(account);
        token1In = (await getERC20("dai")).connect(account);
    });

    it("swap and put nearly equal", async function () {
        await showBalances();

        const amountToken0In = toE18(100);
        const amountToken1In = toE18(100);
        const amountToken0Out = toE6(400);
        const amountToken1Out = toE6(500);

        await (await token0In.approve(baseSwapZap.address, amountToken0In)).wait();
        await (await token1In.approve(baseSwapZap.address, amountToken1In)).wait();
        await (await token0Out.approve(baseSwapZap.address, amountToken0Out)).wait();
        await (await token1Out.approve(baseSwapZap.address, amountToken1Out)).wait();

        const reserves = await baseSwapZap.getProportion(gauge, poolId);
        const sumReserves = reserves[0].add(reserves[1])

        const proportions = calculateProportionForPool({
            inputTokensDecimals: [18, 18],
            inputTokensAddresses: [token0In.address, token1In.address],
            inputTokensAmounts: [amountToken0In, amountToken1In],
            inputTokensPrices: [1, 1],
            outputTokensDecimals: [6, 6],
            outputTokensAddresses: [token0Out.address, token1Out.address],
            outputTokensAmounts: [amountToken0Out, amountToken1Out],
            outputTokensPrices: [1, 1],
            proportion0: reserves[0] / sumReserves
        })

        const request = await getOdosRequest({
            "chainId": 8453,
            "inputTokens": proportions.inputTokens,
            "outputTokens": proportions.outputTokens,
            "gasPrice": 0.1,
            "userAddr": baseSwapZap.address,
            "slippageLimitPercent": 0.4,
        });

        const inputTokens = proportions.inputTokens.map(({ tokenAddress, amount }) => {
            return { "tokenAddress": tokenAddress, "amountIn": amount };
        });
        const outputTokens = proportions.outputTokens.map(({ tokenAddress }) => {
            return { "tokenAddress": tokenAddress, "receiver": baseSwapZap.address };
        });


        const receipt = await (await baseSwapZap.connect(account).zapIn({
            inputs: inputTokens,
            outputs: outputTokens,
            data: request.data
        }, { gauge, amountsOut: [proportions.amountToken0Out, proportions.amountToken1Out], poolId })).wait();

        console.log(`Transaction was mined in block ${receipt.blockNumber}`);

        await showBalances();

        const inputTokensEvent = receipt.events.find((event) => event.event === "InputTokens");
        const outputTokensEvent = receipt.events.find((event) => event.event === "OutputTokens");
        const putIntoPoolEvent = receipt.events.find((event) => event.event === "PutIntoPool");
        const returnedToUserEvent = receipt.events.find((event) => event.event === "ReturnedToUser");


        console.log(`Input tokens: ${inputTokensEvent.args.amountsIn} ${inputTokensEvent.args.tokensIn}`);
        console.log(`Output tokens: ${outputTokensEvent.args.amountsOut} ${outputTokensEvent.args.tokensOut}`);
        console.log(`Tokens put into pool: ${putIntoPoolEvent.args.amountsPut} ${putIntoPoolEvent.args.tokensPut}`);
        console.log(`Tokens returned to user: ${returnedToUserEvent.args.amountsReturned} ${returnedToUserEvent.args.tokensReturned}`);



        expect(token0In.address).to.equals(inputTokensEvent.args.tokensIn[0]);
        expect(token1In.address).to.equals(inputTokensEvent.args.tokensIn[1]);

        expect(amountToken0In).to.equals(inputTokensEvent.args.amountsIn[0]);
        expect(amountToken1In).to.equals(inputTokensEvent.args.amountsIn[1]);

        expect(token0Out.address).to.equals(putIntoPoolEvent.args.tokensPut[0]);
        expect(token1Out.address).to.equals(putIntoPoolEvent.args.tokensPut[1]);

        expect(token0Out.address).to.equals(returnedToUserEvent.args.tokensReturned[0]);
        expect(token1Out.address).to.equals(returnedToUserEvent.args.tokensReturned[1]);

        // 1) tokensPut в пределах границы согласно пропорциям внутри пула:
        const proportion0 = fromE6(reserves[0]) / fromE6(reserves[0].add(reserves[1]))
        console.log(proportion0)
        const proportion1 = fromE6(reserves[1]) / fromE6(reserves[0].add(reserves[1]))
        const putTokenAmount0 = fromE18(putIntoPoolEvent.args.amountsPut[0] > 1e14 ? putIntoPoolEvent.args.amountsPut[0] : putIntoPoolEvent.args.amountsPut[0] * 1e12)
        const putTokenAmount1 = fromE18(putIntoPoolEvent.args.amountsPut[1] > 1e14 ? putIntoPoolEvent.args.amountsPut[1] : putIntoPoolEvent.args.amountsPut[1] * 1e12)
        expect(Math.abs(proportion0 - putTokenAmount0 / (putTokenAmount0 + putTokenAmount1))).to.lessThan(0.001);
        expect(Math.abs(proportion1 - putTokenAmount1 / (putTokenAmount0 + putTokenAmount1))).to.lessThan(0.001);

        // 2) Общая сумма вложенного = (общей сумме обменненого - допустимый slippage)

        const inTokenAmount0 = fromE18(inputTokensEvent.args.amountsIn[0] > 1e14 ? inputTokensEvent.args.amountsIn[0] : inputTokensEvent.args.amountsIn[0] * 1e12)
        const inTokenAmount1 = fromE18(inputTokensEvent.args.amountsIn[1] > 1e14 ? inputTokensEvent.args.amountsIn[1] : inputTokensEvent.args.amountsIn[1] * 1e12)


        const outTokenAmount0 = fromE18(outputTokensEvent.args.amountsOut[0] > 1e14 ? outputTokensEvent.args.amountsOut[0] : outputTokensEvent.args.amountsOut[0] * 1e12)
        const outTokenAmount1 = fromE18(outputTokensEvent.args.amountsOut[1] > 1e14 ? outputTokensEvent.args.amountsOut[1] : outputTokensEvent.args.amountsOut[1] * 1e12)

        console.log(inTokenAmount0, inTokenAmount1, putTokenAmount0, putTokenAmount1);

        expect(fromE18(await token0In.balanceOf(baseSwapZap.address))).to.lessThan(1);
        expect(fromE18(await token1In.balanceOf(baseSwapZap.address))).to.lessThan(1);
        expect(fromE6(await token0Out.balanceOf(baseSwapZap.address))).to.lessThan(1);
        expect(fromE6(await token0Out.balanceOf(baseSwapZap.address))).to.lessThan(1);


    });

    it("swap and put disbalances on one asset", async function () {

        await showBalances();

        const amountToken0In = toE18(100);
        const amountToken1In = toE18(100);
        const amountToken0Out = toE6(800);
        const amountToken1Out = toE6(100);

        await (await token0In.approve(baseSwapZap.address, amountToken0In)).wait();
        await (await token1In.approve(baseSwapZap.address, amountToken1In)).wait();
        await (await token0Out.approve(baseSwapZap.address, amountToken0Out)).wait();
        await (await token1Out.approve(baseSwapZap.address, amountToken1Out)).wait();

        const reserves = await baseSwapZap.getProportion(gauge, poolId);
        const sumReserves = reserves[0].add(reserves[1])

        const proportions = calculateProportionForPool({
            inputTokensDecimals: [18, 18],
            inputTokensAddresses: [token0In.address, token1In.address],
            inputTokensAmounts: [amountToken0In, amountToken1In],
            inputTokensPrices: [1, 1],
            outputTokensDecimals: [6, 6],
            outputTokensAddresses: [token0Out.address, token1Out.address],
            outputTokensAmounts: [amountToken0Out, amountToken1Out],
            outputTokensPrices: [1, 1],
            proportion0: reserves[0] / sumReserves
        })

        const request = await getOdosRequest({
            "chainId": 8453,
            "inputTokens": proportions.inputTokens,
            "outputTokens": proportions.outputTokens,
            "gasPrice": 0.1,
            "userAddr": baseSwapZap.address,
            "slippageLimitPercent": 0.4,
        });


        const inputTokens = proportions.inputTokens.map(({ tokenAddress, amount }) => {
            return { "tokenAddress": tokenAddress, "amountIn": amount };
        });
        const outputTokens = proportions.outputTokens.map(({ tokenAddress }) => {
            return { "tokenAddress": tokenAddress, "receiver": baseSwapZap.address };
        });


        const receipt = await (await baseSwapZap.connect(account).zapIn({
            inputs: inputTokens,
            outputs: outputTokens,
            data: request.data
        }, { gauge, amountsOut: [proportions.amountToken0Out, proportions.amountToken1Out], poolId })).wait();

        console.log(`Transaction was mined in block ${receipt.blockNumber}`);

        await showBalances();

        const inputTokensEvent = receipt.events.find((event) => event.event === "InputTokens");
        const outputTokensEvent = receipt.events.find((event) => event.event === "OutputTokens");
        const putIntoPoolEvent = receipt.events.find((event) => event.event === "PutIntoPool");
        const returnedToUserEvent = receipt.events.find((event) => event.event === "ReturnedToUser");


        console.log(`Input tokens: ${inputTokensEvent.args.amountsIn} ${inputTokensEvent.args.tokensIn}`);
        console.log(`Output tokens: ${outputTokensEvent.args.amountsOut} ${outputTokensEvent.args.tokensOut}`);
        console.log(`Tokens put into pool: ${putIntoPoolEvent.args.amountsPut} ${putIntoPoolEvent.args.tokensPut}`);
        console.log(`Tokens returned to user: ${returnedToUserEvent.args.amountsReturned} ${returnedToUserEvent.args.tokensReturned}`);



        expect(token0In.address).to.equals(inputTokensEvent.args.tokensIn[0]);
        expect(token1In.address).to.equals(inputTokensEvent.args.tokensIn[1]);

        expect(amountToken0In).to.equals(inputTokensEvent.args.amountsIn[0]);
        expect(amountToken1In).to.equals(inputTokensEvent.args.amountsIn[1]);

        expect(token0Out.address).to.equals(putIntoPoolEvent.args.tokensPut[0]);
        expect(token1Out.address).to.equals(putIntoPoolEvent.args.tokensPut[1]);

        expect(token0Out.address).to.equals(returnedToUserEvent.args.tokensReturned[0]);
        expect(token1Out.address).to.equals(returnedToUserEvent.args.tokensReturned[1]);

        // 1) tokensPut в пределах границы согласно пропорциям внутри пула:
        const proportion0 = fromE6(reserves[0]) / fromE6(reserves[0].add(reserves[1]))
        console.log(proportion0)
        const proportion1 = fromE6(reserves[1]) / fromE6(reserves[0].add(reserves[1]))
        const putTokenAmount0 = fromE18(putIntoPoolEvent.args.amountsPut[0] > 1e14 ? putIntoPoolEvent.args.amountsPut[0] : putIntoPoolEvent.args.amountsPut[0] * 1e12)
        const putTokenAmount1 = fromE18(putIntoPoolEvent.args.amountsPut[1] > 1e14 ? putIntoPoolEvent.args.amountsPut[1] : putIntoPoolEvent.args.amountsPut[1] * 1e12)
        expect(Math.abs(proportion0 - putTokenAmount0 / (putTokenAmount0 + putTokenAmount1))).to.lessThan(0.001);
        expect(Math.abs(proportion1 - putTokenAmount1 / (putTokenAmount0 + putTokenAmount1))).to.lessThan(0.001);

        // 2) Общая сумма вложенного = (общей сумме обменненого - допустимый slippage)

        const inTokenAmount0 = fromE18(inputTokensEvent.args.amountsIn[0] > 1e14 ? inputTokensEvent.args.amountsIn[0] : inputTokensEvent.args.amountsIn[0] * 1e12)
        const inTokenAmount1 = fromE18(inputTokensEvent.args.amountsIn[1] > 1e14 ? inputTokensEvent.args.amountsIn[1] : inputTokensEvent.args.amountsIn[1] * 1e12)


        const outTokenAmount0 = fromE18(outputTokensEvent.args.amountsOut[0] > 1e14 ? outputTokensEvent.args.amountsOut[0] : outputTokensEvent.args.amountsOut[0] * 1e12)
        const outTokenAmount1 = fromE18(outputTokensEvent.args.amountsOut[1] > 1e14 ? outputTokensEvent.args.amountsOut[1] : outputTokensEvent.args.amountsOut[1] * 1e12)

        console.log(inTokenAmount0, inTokenAmount1, putTokenAmount0, putTokenAmount1);

        expect(fromE18(await token0In.balanceOf(baseSwapZap.address))).to.lessThan(1);
        expect(fromE18(await token1In.balanceOf(baseSwapZap.address))).to.lessThan(1);
        expect(fromE6(await token0Out.balanceOf(baseSwapZap.address))).to.lessThan(1);
        expect(fromE6(await token0Out.balanceOf(baseSwapZap.address))).to.lessThan(1);


    });

    it("swap and put disbalanced on another asset", async function () {

        await showBalances();

        const amountToken0In = toE18(100);
        const amountToken1In = toE18(100);
        const amountToken0Out = toE6(100);
        const amountToken1Out = toE6(800);

        await (await token0In.approve(baseSwapZap.address, amountToken0In)).wait();
        await (await token1In.approve(baseSwapZap.address, amountToken1In)).wait();
        await (await token0Out.approve(baseSwapZap.address, amountToken0Out)).wait();
        await (await token1Out.approve(baseSwapZap.address, amountToken1Out)).wait();

        const reserves = await baseSwapZap.getProportion(gauge, poolId);
        const sumReserves = reserves[0].add(reserves[1])

        const proportions = calculateProportionForPool({
            inputTokensDecimals: [18, 18],
            inputTokensAddresses: [token0In.address, token1In.address],
            inputTokensAmounts: [amountToken0In, amountToken1In],
            inputTokensPrices: [1, 1],
            outputTokensDecimals: [6, 6],
            outputTokensAddresses: [token0Out.address, token1Out.address],
            outputTokensAmounts: [amountToken0Out, amountToken1Out],
            outputTokensPrices: [1, 1],
            proportion0: reserves[0] / sumReserves
        })

        const request = await getOdosRequest({
            "chainId": 8453,
            "inputTokens": proportions.inputTokens,
            "outputTokens": proportions.outputTokens,
            "gasPrice": 0.1,
            "userAddr": baseSwapZap.address,
            "slippageLimitPercent": 0.4,
        });


        const inputTokens = proportions.inputTokens.map(({ tokenAddress, amount }) => {
            return { "tokenAddress": tokenAddress, "amountIn": amount };
        });
        const outputTokens = proportions.outputTokens.map(({ tokenAddress }) => {
            return { "tokenAddress": tokenAddress, "receiver": baseSwapZap.address };
        });


        const receipt = await (await baseSwapZap.connect(account).zapIn({
            inputs: inputTokens,
            outputs: outputTokens,
            data: request.data
        }, { gauge, amountsOut: [proportions.amountToken0Out, proportions.amountToken1Out], poolId })).wait();

        console.log(`Transaction was mined in block ${receipt.blockNumber}`);

        await showBalances();

        const inputTokensEvent = receipt.events.find((event) => event.event === "InputTokens");
        const outputTokensEvent = receipt.events.find((event) => event.event === "OutputTokens");
        const putIntoPoolEvent = receipt.events.find((event) => event.event === "PutIntoPool");
        const returnedToUserEvent = receipt.events.find((event) => event.event === "ReturnedToUser");


        console.log(`Input tokens: ${inputTokensEvent.args.amountsIn} ${inputTokensEvent.args.tokensIn}`);
        console.log(`Output tokens: ${outputTokensEvent.args.amountsOut} ${outputTokensEvent.args.tokensOut}`);
        console.log(`Tokens put into pool: ${putIntoPoolEvent.args.amountsPut} ${putIntoPoolEvent.args.tokensPut}`);
        console.log(`Tokens returned to user: ${returnedToUserEvent.args.amountsReturned} ${returnedToUserEvent.args.tokensReturned}`);



        expect(token0In.address).to.equals(inputTokensEvent.args.tokensIn[0]);
        expect(token1In.address).to.equals(inputTokensEvent.args.tokensIn[1]);

        expect(amountToken0In).to.equals(inputTokensEvent.args.amountsIn[0]);
        expect(amountToken1In).to.equals(inputTokensEvent.args.amountsIn[1]);

        expect(token0Out.address).to.equals(putIntoPoolEvent.args.tokensPut[0]);
        expect(token1Out.address).to.equals(putIntoPoolEvent.args.tokensPut[1]);

        expect(token0Out.address).to.equals(returnedToUserEvent.args.tokensReturned[0]);
        expect(token1Out.address).to.equals(returnedToUserEvent.args.tokensReturned[1]);

        // 1) tokensPut в пределах границы согласно пропорциям внутри пула:
        const proportion0 = fromE6(reserves[0]) / fromE6(reserves[0].add(reserves[1]))
        console.log(proportion0)
        const proportion1 = fromE6(reserves[1]) / fromE6(reserves[0].add(reserves[1]))
        const putTokenAmount0 = fromE18(putIntoPoolEvent.args.amountsPut[0] > 1e14 ? putIntoPoolEvent.args.amountsPut[0] : putIntoPoolEvent.args.amountsPut[0] * 1e12)
        const putTokenAmount1 = fromE18(putIntoPoolEvent.args.amountsPut[1] > 1e14 ? putIntoPoolEvent.args.amountsPut[1] : putIntoPoolEvent.args.amountsPut[1] * 1e12)
        expect(Math.abs(proportion0 - putTokenAmount0 / (putTokenAmount0 + putTokenAmount1))).to.lessThan(0.001);
        expect(Math.abs(proportion1 - putTokenAmount1 / (putTokenAmount0 + putTokenAmount1))).to.lessThan(0.001);

        // 2) Общая сумма вложенного = (общей сумме обменненого - допустимый slippage)

        const inTokenAmount0 = fromE18(inputTokensEvent.args.amountsIn[0] > 1e14 ? inputTokensEvent.args.amountsIn[0] : inputTokensEvent.args.amountsIn[0] * 1e12)
        const inTokenAmount1 = fromE18(inputTokensEvent.args.amountsIn[1] > 1e14 ? inputTokensEvent.args.amountsIn[1] : inputTokensEvent.args.amountsIn[1] * 1e12)


        const outTokenAmount0 = fromE18(outputTokensEvent.args.amountsOut[0] > 1e14 ? outputTokensEvent.args.amountsOut[0] : outputTokensEvent.args.amountsOut[0] * 1e12)
        const outTokenAmount1 = fromE18(outputTokensEvent.args.amountsOut[1] > 1e14 ? outputTokensEvent.args.amountsOut[1] : outputTokensEvent.args.amountsOut[1] * 1e12)

        console.log(inTokenAmount0, inTokenAmount1, putTokenAmount0, putTokenAmount1);

        expect(fromE18(await token0In.balanceOf(baseSwapZap.address))).to.lessThan(1);
        expect(fromE18(await token1In.balanceOf(baseSwapZap.address))).to.lessThan(1);
        expect(fromE6(await token0Out.balanceOf(baseSwapZap.address))).to.lessThan(1);
        expect(fromE6(await token0Out.balanceOf(baseSwapZap.address))).to.lessThan(1);


    });


    async function showBalances() {

        const items = [];

        items.push({
            name: await token0In.symbol(),
            balance: fromE18(await token0In.balanceOf(account.address))
        });

        items.push({
            name: await token1In.symbol(),
            balance: fromE18(await token1In.balanceOf(account.address))
        });

        items.push({
            name: await token0Out.symbol(),
            balance: fromE6(await token0Out.balanceOf(account.address))
        });

        items.push({
            name: await token1Out.symbol(),
            balance: fromE6(await token1Out.balanceOf(account.address))
        });

        console.table(items);
    }

});

async function getOdosRequest(request) {
    let swapParams = {
        "chainId": request.chainId,
        "inputTokens": request.inputTokens,
        "outputTokens": request.outputTokens,
        "gasPrice": request.gasPrice,
        "userAddr": request.userAddr,
        "slippageLimitPercent": request.slippageLimitPercent,
        "sourceBlacklist": ["Hashflow"],
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
            "simulate": false
        }

        console.log("assembleData: ", assembleData)
        transaction = (await axios.post(urlAssemble, assembleData, { headers: { "Accept-Encoding": "br" } }));
    } catch (e) {
        console.log("[baseSwapZap] getSwapTransaction: ", e);
        return 0;
    }

    if (transaction.statusCode === 400) {
        console.log(`[baseSwapZap]  ${transaction.description}`);
        return 0;
    }

    if (transaction.data.transaction === undefined) {
        console.log("[baseSwapZap] transaction.tx is undefined");
        return 0;
    }

    console.log('Success get data from Odos!');
    return transaction.data.transaction;
}

function calculateProportionForPool({
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
        sumInputs += Number.parseFloat(new BigNumber(inputTokensAmounts[i].toString()).div(new BigNumber(10).pow(inputTokensDecimals[i])).toFixed(3).toString()) * inputTokensPrices[i];
    }
    sumInputs += sumInitialOut;

    const output0InMoneyWithProportion = sumInputs * proportion0;
    const output1InMoneyWithProportion = sumInputs * (1 - proportion0);
    const inputTokens = inputTokensAddresses.map((address, index) => {
        return { "tokenAddress": address, "amount": inputTokensAmounts[index].toString() };
    });
    if (output0InMoneyWithProportion < tokenOut0) {
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
        const dif = tokenOut1 - output1InMoneyWithProportion;
        const token1AmountForSwap = new BigNumber((dif / outputTokensPrices[1]).toString()).times(new BigNumber(10).pow(outputTokensDecimals[1])).toFixed(0);
        // console.log(new BigNumber((output1InMoneyWithProportion / outputTokensPrices[1]).toString()).times(new BigNumber(10).pow(outputTokensDecimals[1])).toFixed(0), outputTokensAmounts[1].toString());
        inputTokens.push({ "tokenAddress": outputTokensAddresses[1], "amount": token1AmountForSwap.toString() })
        // console.log(inputTokens)
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
    }

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


async function getPlusTokens(amount, to) {

    let usdPlus = await getContract('UsdPlusToken', 'base');
    let daiPlus = await getContract('UsdPlusToken', 'base_dai');

    await execTimelock(async (timelock) => {
        let exchangeUsdPlus = await usdPlus.exchange();
        let exchangeDaiPlus = await usdPlus.exchange();

        await usdPlus.connect(timelock).setExchanger(timelock.address);
        await usdPlus.connect(timelock).mint(to, toE6(amount));
        await usdPlus.connect(timelock).setExchanger(exchangeUsdPlus);

        await daiPlus.connect(timelock).setExchanger(timelock.address);
        await daiPlus.connect(timelock).mint(to, toE18(amount));
        await daiPlus.connect(timelock).setExchanger(exchangeDaiPlus);
    })

}


async function setUp() {

    const signers = await ethers.getSigners();
    const account = signers[0];

    await transferAsset(BASE.dai, account.address);
    await transferAsset(BASE.usdbc, account.address);

    await getPlusTokens(10_000, account.address);

    return account;

}
