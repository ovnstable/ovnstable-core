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
const abiNFTPool = require("./abi/NFTPool.json");
const { getOdosAmountOut, getOdosSwapData } = require("@overnight-contracts/common/utils/odos-helper");
const { getOdosAmountOutOnly } = require("../../common/utils/odos-helper.js");

let zaps = [
    {
        name: 'AerodromeCLZap',
        pair: '0x0c1A09d5D0445047DA3Ab4994262b22404288A3B',
        token0In: 'usdc',
        token1In: 'usdPlus',
        token0Out: 'usdcCircle',
        token1Out: 'usdt',
        priceRange: [0.95, 1.05],
    }
];


describe('Testing all zaps with CL', function() {
    zaps.forEach((params) => {
        describe(`Test ${params?.name}`, function () {

            let zap;

            let account;

            let token0In;
            let token1In;
            let token0Out;
            let token1Out;

            let token0InDec;
            let token1InDec;
            let token0OutDec;
            let token1OutDec;

            let toToken0In;
            let toToken1In;
            let toToken0Out;
            let toToken1Out;

            let fromToken0In;
            let fromToken1In;
            let fromToken0Out;
            let fromToken1Out;

            sharedBeforeEach('deploy and setup', async () => {
                await hre.run("compile");
                await resetHardhatToLastBlock();
                await deployments.fixture([params.name]);

                zap = await ethers.getContract(params.name);

                let setUpParams = await setUp(params);

                console.log("setUp done successfully")

                account = setUpParams.account;
                token0In = setUpParams.token0In;
                token1In = setUpParams.token1In;
                token0Out = setUpParams.token0Out;
                token1Out = setUpParams.token1Out;

                

                console.log("token0", token0In.address);
                token0InDec = await token0In.decimals();

                console.log("token1", token1In.address);
                token1InDec = await token1In.decimals();

                console.log("token0", token0Out.address);
                token0OutDec = await token0Out.decimals();

                console.log("token1", token1Out.address);
                token1OutDec = await token1Out.decimals();

                toToken0In = token0InDec == 6 ? toE6 : toE18;
                toToken1In = token1InDec == 6 ? toE6 : toE18;
                toToken0Out = token0OutDec == 6 ? toE6 : toE18;
                toToken1Out = token1OutDec == 6 ? toE6 : toE18;

                fromToken0In = token0InDec == 6 ? fromE6 : fromE18;
                fromToken1In = token1InDec == 6 ? fromE6 : fromE18;
                fromToken0Out = token0OutDec == 6 ? fromE6 : fromE18;
                fromToken1Out = token1OutDec == 6 ? fromE6 : fromE18;

                
                params.priceRange[0] = toToken0Out(params.priceRange[0]);
                params.priceRange[1] = toToken1Out(params.priceRange[1]);
                
            });

            it("swap and put nearly equal", async function () {

                const amountToken0In = toToken0In(1);
                const amountToken1In = toToken1In(1);
                const amountToken0Out = toToken0Out(4);
                const amountToken1Out = toToken1Out(5);

                await check(amountToken0In, amountToken1In, amountToken0Out, amountToken1Out);
            });

            it("swap and disbalance on one asset", async function () {

                const amountToken0In = toToken0In(100);
                const amountToken1In = toToken1In(100);
                const amountToken0Out = toToken0Out(800);
                const amountToken1Out = toToken1Out(100);

                await check(amountToken0In, amountToken1In, amountToken0Out, amountToken1Out);
            });

            it("swap and disbalance on another asset", async function () {

                const amountToken0In = toToken0In(100);
                const amountToken1In = toToken1In(100);
                const amountToken0Out = toToken0Out(100);
                const amountToken1Out = toToken1Out(700);

                await check(amountToken0In, amountToken1In, amountToken0Out, amountToken1Out);
            });

            async function check(amountToken0In, amountToken1In, amountToken0Out, amountToken1Out) {

                await showBalances();

                await (await token0In.approve(zap.address, toE18(10000))).wait();
                await (await token1In.approve(zap.address, toE18(10000))).wait();
                await (await token0Out.approve(zap.address, toE18(10000))).wait();
                await (await token1Out.approve(zap.address, toE18(10000))).wait();

                let reserves;
                if ('pair' in params) {
                    reserves = await zap.getProportion(params.pair, params.sqrtRange);
                } else if ('poolId' in params) {
                    reserves = await zap.getProportion(params.gauge, params.poolId);
                } else {
                    reserves = await zap.getProportion(params.gauge);
                }
                const sumReserves = reserves[0].add(reserves[1]);

                const proportions = calculateProportionForPool({
                    inputTokensDecimals: [token0InDec, token1InDec],
                    inputTokensAddresses: [token0In.address, token1In.address],
                    inputTokensAmounts: [amountToken0In, amountToken1In],
                    inputTokensPrices: [1, 1],
                    outputTokensDecimals: [token0OutDec, token1OutDec],
                    outputTokensAddresses: [token0Out.address, token1Out.address],
                    outputTokensAmounts: [amountToken0Out, amountToken1Out],
                    outputTokensPrices: [1, 1],
                    proportion0: reserves[0] / sumReserves
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

                let receipt = await (await zap.connect(account).zapIn(
                    {
                        inputs: inputTokens,
                        outputs: outputTokens,
                        data: request.data
                    },
                    {
                        amountsOut: [proportions.amountToken0Out, proportions.amountToken1Out],
                        ...params,
                    }
                )).wait();

                if ('tokenId' in params) {
                    let gauge = await ethers.getContractAt(abiNFTPool, params.gauge, account);
                    let lastTokenId = await gauge.lastTokenId();
                    params.tokenId = lastTokenId;
                    console.log("lastTokenId: " + lastTokenId);

                    await gauge.connect(account).approve(zap.address, lastTokenId);

                    receipt = await (await zap.connect(account).zapIn(
                        {
                            inputs: inputTokens,
                            outputs: outputTokens,
                            data: request.data
                        },
                        {
                            amountsOut: [proportions.amountToken0Out, proportions.amountToken1Out],
                            ...params,
                        }
                    )).wait();

                    params.tokenId = 0;
                }

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
                const proportion0 = reserves[0] / sumReserves;
                const proportion1 = reserves[1] / sumReserves;
                const putTokenAmount0 = fromToken0Out(putIntoPoolEvent.args.amountsPut[0]);
                const putTokenAmount1 = fromToken1Out(putIntoPoolEvent.args.amountsPut[1]);

                expect(Math.abs(proportion0 - putTokenAmount0 / (putTokenAmount0 + putTokenAmount1))).to.lessThan(0.05);
                expect(Math.abs(proportion1 - putTokenAmount1 / (putTokenAmount0 + putTokenAmount1))).to.lessThan(0.05);

                // 2) Общая сумма вложенного = (общей сумме обменненого - допустимый slippage)
                const inTokenAmount0 = fromToken0In(inputTokensEvent.args.amountsIn[0]);
                const inTokenAmount1 = fromToken1In(inputTokensEvent.args.amountsIn[1]);
                const outTokenAmount0 = fromToken0Out(outputTokensEvent.args.amountsOut[0]);
                const outTokenAmount1 = fromToken1Out(outputTokensEvent.args.amountsOut[1]);

                expect(fromToken0In(await token0In.balanceOf(zap.address))).to.lessThan(1);
                expect(fromToken1In(await token1In.balanceOf(zap.address))).to.lessThan(1);
                expect(fromToken0Out(await token0Out.balanceOf(zap.address))).to.lessThan(1);
                expect(fromToken1Out(await token1Out.balanceOf(zap.address))).to.lessThan(1);
            }

            async function showBalances() {
                const items = [];

                items.push({
                    name: await token0In.symbol(),
                    balance: fromToken0In(await token0In.balanceOf(account.address))
                });

                items.push({
                    name: await token1In.symbol(),
                    balance: fromToken1In(await token1In.balanceOf(account.address))
                });

                items.push({
                    name: await token0Out.symbol(),
                    balance: fromToken0Out(await token0Out.balanceOf(account.address))
                });

                items.push({
                    name: await token1Out.symbol(),
                    balance: fromToken1Out(await token1Out.balanceOf(account.address))
                });

                console.table(items);
            }
        });
    });
});

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

        transaction = (await axios.post(urlAssemble, assembleData, { headers: { "Accept-Encoding": "br" } }));
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
}) {
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

    let usdPlus = await getContract('UsdPlusToken', process.env.STAND);

    let usdc;
    if (process.env.STAND === 'base') {
        usdc = await getERC20('usdbc');
    } else {
        usdc = await getERC20('usdc');
    }
    let dai = await getERC20('dai');

    await transferAsset(usdc.address, account.address);
    await transferAsset(dai.address, account.address);
    try {
        let token = await getERC20(params.token0In);
        await transferAsset(token.address, account.address);
    } catch (e) {
    }
    try {
        let token = await getERC20(params.token1In);
        await transferAsset(token.address, account.address);
    } catch (e) {
    }
    try {
        let token = await getERC20(params.token0Out);
        await transferAsset(token.address, account.address);
    } catch (e) {
    }
    try {
        let token = await getERC20(params.token1Out);
        await transferAsset(token.address, account.address);
    } catch (e) {
    }

    await execTimelock(async (timelock) => {
        let exchangeUsdPlus = await usdPlus.exchange();

        await usdPlus.connect(timelock).setExchanger(timelock.address);
        await usdPlus.connect(timelock).mint(account.address, toE6(10_000));
        await usdPlus.connect(timelock).setExchanger(exchangeUsdPlus);
    });

    return {
        account: account,
        token0Out: (await getERC20(params.token0Out)).connect(account),
        token1Out: (await getERC20(params.token1Out)).connect(account),
        token0In: (await getERC20(params.token0In)).connect(account),
        token1In: (await getERC20(params.token1In)).connect(account),
    }
}

