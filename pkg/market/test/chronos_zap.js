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
let { ARBITRUM } = require('@overnight-contracts/common/utils/assets');
const { sharedBeforeEach } = require("@overnight-contracts/common/utils/sharedBeforeEach");
const { fromE6, fromE18, toAsset, toE6, toE18 } = require("@overnight-contracts/common/utils/decimals");

const axios = require("axios");

describe("ChronosZapper", function () {

    let chronosZap;

    let account;
    let usdPlus;
    let daiPlus;
    let usdc;
    let dai;

    let token0In;
    let token1In;

    let token0Out;
    let token1Out;

    sharedBeforeEach('deploy and setup', async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");
        await resetHardhatToLastBlock();

        await deployments.fixture(['ChronosZap']);

        account = await setUp();
        chronosZap = await ethers.getContract("ChronosZap");

        token0Out = (await getContract('UsdPlusToken', 'arbitrum')).connect(account);
        token1Out = (await getContract('UsdPlusToken', 'arbitrum_dai')).connect(account);

        token0In = (await getERC20("usdc")).connect(account);
        token1In = (await getERC20("dai")).connect(account);
    });

    it("swap usdc/dai to usd+/dai+ and put to chronos", async function () {

        const gauge = "0xcd4a56221175b88d4fb28ca2138d670cc1197ca9";
        const amountIn = 10;

        await showBalances();

        const amountToken0In = toE6(529);
        const amountToken1In = toE18(189);
        const amountToken0Out = toE6(10);
        const amountToken1Out = toE18(15);

        await (await token0In.approve(chronosZap.address, amountToken0In)).wait();
        await (await token1In.approve(chronosZap.address, amountToken1In)).wait();
        await (await token0Out.approve(chronosZap.address, amountToken0Out)).wait();
        await (await token1Out.approve(chronosZap.address, amountToken1Out)).wait();

        const reserves = await chronosZap.getProportion(gauge);

        const sumReserves = reserves[0].add(reserves[1])
        const proportions = calculateProportionForChronosSwapModif({
            inputTokensDecimalsFunctions: [fromE6, fromE18],
            inputTokensAddresses: [token0In.address, token1In.address],
            inputTokensAmounts: [amountToken0In, amountToken1In],
            inputTokensPrices: [1, 1],
            outputTokensDecimalsFunctions: [fromE6, fromE18],
            inverseOutputTokensDecimalsFunctions: [toE6, toE18],
            outputTokensAddresses: [token0Out.address, token1Out.address],
            outputTokensAmounts: [amountToken0Out, amountToken1Out],
            outputTokensPrices: [1, 1],
            proportion0: reserves[0] / sumReserves
        })
        // {
        //     inputTokensDecimals,
        //     inputTokensAddresses,
        //     inputTokensAmounts,
        //     inputTokensPrices,
        //     outputTokensDecimals,
        //     outputTokensAddresses,
        //     outputTokensAmounts,
        //     outputTokensPrices,
        //     proportion0,
        // }
        console.log(proportions)

        const request = await getOdosRequest({
            "chainId": 42161,
            "inputTokens": proportions.inputTokens,
            "outputTokens": proportions.outputTokens,
            "gasPrice": 20,
            "userAddr": chronosZap.address,
            "slippageLimitPercent": 0.3,
        });

        console.log({
            inputs: proportions.inputTokens,
            outputs: [
                {
                    tokenAddress: proportions.outputTokens[0].tokenAddress,
                    receiver: chronosZap.address,
                },
                {
                    tokenAddress: proportions.outputTokens[1].tokenAddress,
                    receiver: chronosZap.address,
                },
            ],
            data: request.data
        }, { gauge, amountToken0Out, amountToken1Out })


        const inputTokens = proportions.inputTokens.map(({ tokenAddress, amount }) => {
            return { "tokenAddress": tokenAddress, "amountIn": amount };
        });


        const receipt = await (await chronosZap.connect(account).zapIn({
            inputs: inputTokens,
            outputs: [
                {
                    tokenAddress: proportions.outputTokens[0].tokenAddress,
                    receiver: chronosZap.address,
                },
                {
                    tokenAddress: proportions.outputTokens[1].tokenAddress,
                    receiver: chronosZap.address,
                },
            ],
            data: request.data
        }, { gauge, amountToken0Out, amountToken1Out })).wait();

        console.log(`Transaction was mined in block ${receipt.blockNumber}`);

        await showBalances();

        // Retrieve event logs
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

        expect(token0Out.address).to.equals(outputTokensEvent.args.tokensOut[0]);
        expect(token1Out.address).to.equals(outputTokensEvent.args.tokensOut[1]);

        expect(token0Out.address).to.equals(putIntoPoolEvent.args.tokensPut[0]);
        expect(token1Out.address).to.equals(putIntoPoolEvent.args.tokensPut[1]);

        expect(token0Out.address).to.equals(returnedToUserEvent.args.tokensReturned[0]);
        expect(token1Out.address).to.equals(returnedToUserEvent.args.tokensReturned[1]);

        // 1) tokensPut в пределах границы согласно пропорциям внутри пула:
        // expect(amountToken0In).to.equals(inputTokensEvent.args.amountsIn[0]);
        // expect(amountToken1In).to.equals(inputTokensEvent.args.amountsIn[1]);
        const proportion0 = fromE18(reserves[0]) / fromE18(reserves[0].add(reserves[1]))
        const proportion1 = fromE18(reserves[1]) / fromE18(reserves[0].add(reserves[1]))
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
        expect(inTokenAmount0 + inTokenAmount1).to.lessThanOrEqual((outTokenAmount0 + outTokenAmount0) / (1 - 0.003));

        expect(inTokenAmount0 + inTokenAmount1).to.lessThanOrEqual((putTokenAmount0 + putTokenAmount1) / (1 - 0.05));


        // 3) Free assets token0In|Out, token1In|Out не осталось на контракте с Zap-ом
        // console.log(fromE6(await token0In.balanceOf(chronosZap.address)))

        expect(fromE6(await token0In.balanceOf(chronosZap.address))).to.lessThan(1);
        expect(fromE18(await token1In.balanceOf(chronosZap.address))).to.lessThan(1);
        expect(fromE6(await token0Out.balanceOf(chronosZap.address))).to.lessThan(1);
        expect(fromE18(await token0Out.balanceOf(chronosZap.address))).to.lessThan(1);


    });


    async function showBalances() {

        const items = [];

        items.push({
            name: await token0In.symbol(),
            balance: fromE6(await token0In.balanceOf(account.address))
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
            balance: fromE18(await token1Out.balanceOf(account.address))
        });

        console.table(items);
    }

});

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

    // @ts-ignore
    const url = 'https://api.overnight.fi/root/odos/sor/swap';
    let transaction;
    try {
        transaction = (await axios.post(url, swapParams, { headers: { "Accept-Encoding": "br" } }));
    } catch (e) {
        console.log("[chronosZap] getSwapTransaction: " + e);
        return 0;
    }

    if (transaction.statusCode === 400) {
        console.log(`[chronosZap]  ${transaction.description}`);
        return 0;
    }

    if (transaction.data.transaction === undefined) {
        console.log("[chronosZap] transaction.tx is undefined");
        return 0;
    }

    console.log('Success get data from Odos!');
    return transaction.data.transaction;
}

function calculateProportionForChronosSwap({
    tokenOut0Amount,
    tokenOut0Price,
    tokenOut1Amount,
    tokenOut1Price,
    tokensInputAmount,
    tokensInputPrice,
    proportion0,
}
) {
    const tokenOut0 = tokenOut0Amount * tokenOut0Price;
    const tokenOut1 = tokenOut1Amount * tokenOut1Price;
    const sumInitialOut = tokenOut0 + tokenOut1;
    let sumInputs = 0;
    for (let i = 0; i < tokensInputAmount.length; i++) {
        sumInputs += tokensInputAmount[i] * tokensInputPrice[i];
    }
    sumInputs += sumInitialOut; // общее количество инпутов в деньгах
    console.log(sumInputs)

    const output0InMoneyWithProportion = sumInputs * proportion0;
    const output1InMoneyWithProportion = sumInputs * (1 - proportion0);


    console.log(proportion0, 1 - proportion0)
    // if (output0InMoneyWithProportion < )
    const difToGetFromOdos0 = output0InMoneyWithProportion - tokenOut0;
    const difToGetFromOdos1 = output1InMoneyWithProportion - tokenOut1;


    return { proportion0: difToGetFromOdos0 / (difToGetFromOdos0 + difToGetFromOdos1), proportion1: difToGetFromOdos1 / (difToGetFromOdos0 + difToGetFromOdos1) }
}

function calculateProportionForChronosSwapModif({
    inputTokensDecimalsFunctions,
    inputTokensAddresses,
    inputTokensAmounts,
    inputTokensPrices,
    outputTokensDecimalsFunctions,
    outputTokensAddresses,
    outputTokensAmounts,
    outputTokensPrices,
    inverseOutputTokensDecimalsFunctions,
    proportion0,
}
) {

    const tokenOut0 = outputTokensDecimalsFunctions[0](outputTokensAmounts[0]) * outputTokensPrices[0];
    const tokenOut1 = outputTokensDecimalsFunctions[1](outputTokensAmounts[1]) * outputTokensPrices[1];
    const sumInitialOut = tokenOut0 + tokenOut1;
    let sumInputs = 0;
    for (let i = 0; i < inputTokensAmounts.length; i++) {
        sumInputs += inputTokensDecimalsFunctions[i](inputTokensAmounts[i]) * inputTokensPrices[i];
    }
    sumInputs += sumInitialOut; // общее количество инпутов в деньгах 
    console.log(sumInputs)

    const output0InMoneyWithProportion = sumInputs * proportion0;
    const output1InMoneyWithProportion = sumInputs * (1 - proportion0);
    console.log(output0InMoneyWithProportion, tokenOut0)
    console.log(output1InMoneyWithProportion, tokenOut1)
    let token0AmountForSwap = 0, token1AmountForSwap = 0;
    // "outputTokens": [
    //     {
    //         "tokenAddress": token0Out.address,
    //         "proportion": proportions.proportion0
    //     },
    //     {
    //         "tokenAddress": token1Out.address,
    //         "proportion": proportions.proportion1
    //     },
    // ],

    // "inputTokens": [
    //     {
    //         "tokenAddress": token0In.address,
    //         "amount": amountToken0In
    //     },
    //     {
    //         "tokenAddress": token1In.address,
    //         "amount": amountToken1In
    //     }
    // ],
    const inputTokens = inputTokensAddresses.map((address, index) => {
        return { "tokenAddress": address, "amount": inputTokensAmounts[index] };
    });
    if (output0InMoneyWithProportion < tokenOut0) {
        const dif = tokenOut0 - output0InMoneyWithProportion;
        const token0AmountForSwap = inverseOutputTokensDecimalsFunctions[0](dif) / outputTokensPrices[0];
        inputTokens.push({ "tokenAddress": outputTokensAddresses[0], "amount": token0AmountForSwap })
        return {
            "outputTokens": [
                {
                    "tokenAddress": outputTokensAddresses[1],
                    "proportion": 1
                }
            ],
            "inputTokens": inputTokens
        }
    } else if (output1InMoneyWithProportion < tokenOut1) {
        const dif = tokenOut1 - output1InMoneyWithProportion;
        const token1AmountForSwap = inverseOutputTokensDecimalsFunctions[1](dif) / outputTokensPrices[1];
        inputTokens.push({ "tokenAddress": outputTokensAddresses[1], "amount": token1AmountForSwap })
        return {
            "outputTokens": [
                {
                    "tokenAddress": outputTokensAddresses[0],
                    "proportion": 1
                }
            ],
            "inputTokens": inputTokens
        }
    }

    const difToGetFromOdos0 = output0InMoneyWithProportion - tokenOut0;
    const difToGetFromOdos1 = output1InMoneyWithProportion - tokenOut1;
    return {
        "inputTokens": inputTokens,
        "outputTokens": [
            {
                "tokenAddress": outputTokensAddresses[0],
                "proportion": difToGetFromOdos0 / (difToGetFromOdos0 + difToGetFromOdos1)
            },
            {
                "tokenAddress": outputTokensAddresses[1],
                "proportion": difToGetFromOdos1 / (difToGetFromOdos0 + difToGetFromOdos1)
            },
        ],
    }

}


async function getPlusTokens(amount, to) {

    let usdPlus = await getContract('UsdPlusToken', 'arbitrum');
    let daiPlus = await getContract('UsdPlusToken', 'arbitrum_dai');

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

    await transferAsset(ARBITRUM.dai, account.address);
    await transferAsset(ARBITRUM.usdc, account.address);

    await getPlusTokens(10_000, account.address);

    return account;

}
