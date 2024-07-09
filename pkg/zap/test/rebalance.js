const { expect } = require('chai');
const { deployments, ethers, getNamedAccounts } = require('hardhat');
const {
    transferAsset,
    getERC20,
    transferETH,
    initWallet,
    execTimelock,
    getContract,
    getChainId, getERC721,
} = require('@overnight-contracts/common/utils/script-utils');
const { resetHardhat, greatLess, resetHardhatToLastBlock } = require('@overnight-contracts/common/utils/tests');
const BN = require('bn.js');
const hre = require('hardhat');
const { sharedBeforeEach } = require('@overnight-contracts/common/utils/sharedBeforeEach');
const { toE6, fromE6, fromE18, toAsset, toE18 } = require('@overnight-contracts/common/utils/decimals');
const axios = require('axios');
const { default: BigNumber } = require('bignumber.js');
const { getOdosAmountOut, getOdosSwapData } = require('@overnight-contracts/common/utils/odos-helper');
const { getOdosAmountOutOnly } = require('../../common/utils/odos-helper.js');

let zaps_aerodrome = [
    // {
    //     name: 'AerodromeCLZap',
    //     pair: '0x20086910E220D5f4c9695B784d304A72a0de403B',
    //     inputTokens: ['dai', 'usdPlus'],
    //     priceRange: [1, 1.00022],
    // },
    {
        name: 'AerodromeCLZap',
        pair: '0x4D69971CCd4A636c403a3C1B00c85e99bB9B5606',
        inputTokens: ['weth', 'usdPlus'],
        priceRange: [2800, 3100],
    },
    // {
    //     name: 'AerodromeCLZap',
    //     pair: '0x20086910E220D5f4c9695B784d304A72a0de403B',
    //     inputTokens: ['dai', 'usdPlus'],
    //     priceRange: [1.2, 1.5],
    // },
];

let zaps_pancake = [
    {
        name: 'PancakeCLZap',
        pair: '0x721F37495cD70383B0A77Bf1eB8f97eef29498Bb',
        inputTokens: ['dai', 'usdPlus'],
        priceRange: [0.9997, 1.0002],
    },
    {
        name: 'PancakeCLZap',
        pair: '0xe37304f7489ed253b2a46a1d9dabdca3d311d22e',
        inputTokens: ['dai', 'usdPlus'],
        priceRange: [3100, 3500],
    },
    {
        name: 'PancakeCLZap',
        pair: '0x721F37495cD70383B0A77Bf1eB8f97eef29498Bb',
        inputTokens: ['dai', 'usdPlus'],
        priceRange: [1.2, 1.5],
    },
];

// TODO: remove hardcode
let zaps = zaps_aerodrome;

describe('Testing all zaps', function() {
    zaps.forEach((params) => {
        describe(`Test ${params?.name}`, function() {
            let zap;
            let account;
            let inputTokens;
            let tokensDec;
            let toTokenIn;
            let fromTokenIn;

            sharedBeforeEach('deploy and setup', async () => {
                await hre.run('compile');
                await resetHardhatToLastBlock();
                await deployments.fixture([params.name]);
                zap = await ethers.getContract(params.name);
                let setUpParams = await setUp(params);
                console.log('setUp done successfully');

                account = setUpParams.account;
                inputTokens = setUpParams.inputTokens;
                tokensDec = await Promise.all(inputTokens.map(async (token) => await token.decimals()));

                toTokenIn = tokensDec.map((dec) => dec === 6 ? toE6 : toE18);
                fromTokenIn = tokensDec.map((dec) => dec === 6 ? fromE6 : fromE18);

                let curPriceRange = [...params.priceRange];
                curPriceRange[0] = Math.ceil(toE6(curPriceRange[0])).toString();
                curPriceRange[1] = Math.ceil(toE6(curPriceRange[1])).toString();
                let tickRange = await zap.priceToClosestTick(params.pair, curPriceRange);
                let currentTick = await zap.getCurrentPoolTick(params.pair);
                console.log("priceRange:", params.priceRange);
                console.log("tickRange:", tickRange);
                console.log("currentTick:", currentTick);
                params.tickRange = [...tickRange];
            });

            it('test dev wallet positions', async function() {
                const amounts = [
                    toTokenIn[0](0),
                    toTokenIn[1](0),
                ];
                const prices = [
                    toE18(2900),
                    toE18(0),
                ];
                let tokenId = 43981;
                await check(amounts, prices, tokenId);
            });

            // it('swap and disbalance on one asset', async function() {
            //     const amounts = [
            //         toTokenIn[0](1),
            //         toTokenIn[1](100),
            //     ];
            //     const prices = [
            //         toE18(1),
            //         toE18(1),
            //     ];
            //     await check(amounts, prices);
            // });
            //
            // it('swap and disbalance on another asset', async function() {
            //     const amounts = [
            //         toTokenIn[0](1000),
            //         toTokenIn[1](1),
            //     ];
            //     const prices = [
            //         toE18(1),
            //         toE18(1),
            //     ];
            //     await check(amounts, prices);
            // });
            //
            // it('swap and put outside current range', async function() {
            //     const amounts = [
            //         toTokenIn[0](0),
            //         toTokenIn[1](10000),
            //     ];
            //     const prices = [
            //         toE18(1),
            //         toE18(1),
            //     ];
            //     await check(amounts, prices);
            // });

            async function check(amounts, prices, tokenId) {
                let inputSwapTokens = [];
                for (let i = 0; i < inputTokens.length; i++) {
                    // await (await inputTokens[i].approve(zap.address, toE18(10000))).wait();
                    inputSwapTokens.push({
                        "tokenAddress": inputTokens[i].address,
                        "amount": amounts[i],
                        "price": prices[i],
                    });
                }

                console.log("inputSwapTokens:", inputSwapTokens);

                // let tokenId1 = 102914;
                // let poolId1 = "0x4D69971CCd4A636c403a3C1B00c85e99bB9B5606";
                // let tickRange1 = [-197200,-194900];
                // let inputTokens1 = [
                //     {
                //         tokenAddress: "0x4200000000000000000000000000000000000006",
                //         amount: 0,
                //         price: "3072520172653492400000"
                //     },
                //     {
                //         tokenAddress: "0xB79DD08EA68A908A97220C76d19A6aA9cBDE4376",
                //         amount: 0,
                //         price: "1001339157528039300"
                //     }
                // ];
                let result = await zap.getProportionForRebalance(tokenId, params.pair, params.tickRange, inputSwapTokens);
                console.log("inputTokenAddresses:", result.inputTokenAddresses);
                console.log("inputTokenAmounts:", result.inputTokenAmounts.map((x) => x.toString()));
                console.log("outputTokenAddresses:", result.outputTokenAddresses);
                console.log("outputTokenProportions:", result.outputTokenProportions.map((x) => x.toString()));
                console.log("outputTokenAmounts:", result.outputTokenAmounts.map((x) => x.toString()));

                let proportions = {
                    "inputTokens": result.inputTokenAddresses.map((e, i) => ({
                        "tokenAddress": e,
                        "amount": result.inputTokenAmounts[i].toString()
                    })).filter((x) => x.tokenAddress !== "0x0000000000000000000000000000000000000000"),
                    "outputTokens": result.outputTokenAddresses.map((e, i) => ({
                        "tokenAddress": e,
                        "proportion": fromE6(result.outputTokenProportions[i].toString()),
                    })).filter((x) => x.tokenAddress !== "0x0000000000000000000000000000000000000000"),
                    "amountToken0Out": result.outputTokenAmounts[0].toString(),
                    "amountToken1Out": result.outputTokenAmounts[1].toString(),
                };

                console.log("proportions", proportions);
                let request;
                if (proportions.inputTokens.length === 0 && proportions.outputTokens.length === 0) {
                    request = {
                        "data": "0x"
                    }
                } else {
                    request = await getOdosRequest({
                        'inputTokens': proportions.inputTokens,
                        'outputTokens': proportions.outputTokens,
                        'userAddr': zap.address,
                    });
                }

                const inputTokensSwap = proportions.inputTokens.map(({ tokenAddress, amount }) => {
                    return { "tokenAddress": tokenAddress, "amountIn": amount };
                });
                const outputTokensSwap = proportions.outputTokens.map(({ tokenAddress }) => {
                    return { "tokenAddress": tokenAddress, "receiver": zap.address };
                });

                let swapData = {
                    inputs: inputTokensSwap,
                    outputs: outputTokensSwap,
                    data: request.data,
                };
                let aerodromeData = {
                    pair: params.pair,
                    amountsOut: [proportions.amountToken0Out, proportions.amountToken1Out],
                    tickRange: params.tickRange,
                }
                console.log('swapData:', swapData);
                console.log('aerodromeData:', aerodromeData);
                let nftContract = (await getERC721("aerodromeNpm")).connect(account);
                await (await nftContract.approve(zap.address, tokenId)).wait();

                let price = await (await zap.connect(account).rebalance(swapData, aerodromeData, tokenId)).wait();
                // const tokenId = price.events.find((event) => event.event === 'TokenId').args.tokenId;
                // console.log("tokenId!", tokenId.toString());
                await showBalances();

                const inputTokensEvent = price.events.find((event) => event.event === 'InputTokens');
                const outputTokensEvent = price.events.find((event) => event.event === 'OutputTokens');
                const putIntoPoolEvent = price.events.find((event) => event.event === 'PutIntoPool');
                const returnedToUserEvent = price.events.find((event) => event.event === 'ReturnedToUser');

                console.log(`Input tokens: ${inputTokensEvent.args.amountsIn} ${inputTokensEvent.args.tokensIn}`);
                console.log(`Output tokens: ${outputTokensEvent.args.amountsOut} ${outputTokensEvent.args.tokensOut}`);
                console.log(`Tokens put into pool: ${putIntoPoolEvent.args.amountsPut} ${putIntoPoolEvent.args.tokensPut}`);
                console.log(`Tokens returned to user: ${returnedToUserEvent.args.amountsReturned} ${returnedToUserEvent.args.tokensReturned}`);

            }

            async function showBalances() {
                const items = [];
                for (let i = 0; i < inputTokens.length; i++) {
                    items.push({
                        name: await inputTokens[i].symbol(),
                        balance: fromTokenIn[i](await inputTokens[i].balanceOf(account.address)),
                    });
                }
                console.table(items);
            }
        });
    });
});

async function getOdosRequest(request) {
    let swapParams = {
        'chainId': await getChainId(),
        'gasPrice': 1,
        'inputTokens': request.inputTokens,
        'outputTokens': request.outputTokens,
        'userAddr': request.userAddr,
        'slippageLimitPercent': 1,
        'sourceBlacklist': ['Hashflow', 'Overnight Exchange'],
        'sourceWhitelist': [],
        'simulate': false,
        'pathViz': false,
        'disableRFQs': false,
    };

    // @ts-ignore
    const urlQuote = 'https://api.overnight.fi/root/odos/sor/quote/v2';
    const urlAssemble = 'https://api.overnight.fi/root/odos/sor/assemble';
    let transaction;
    try {
        let quotaResponse = (await axios.post(urlQuote, swapParams, { headers: { 'Accept-Encoding': 'br' } }));

        let assembleData = {
            'userAddr': request.userAddr,
            'pathId': quotaResponse.data.pathId,
            'simulate': true,
        };

        // console.log("assembleData: ", assembleData)
        transaction = (await axios.post(urlAssemble, assembleData, { headers: { 'Accept-Encoding': 'br' } }));
        // console.log('trans: ', transaction, quotaResponse);
        // console.log("odos transaction simulation: ", transaction.data.simulation)
    } catch (e) {
        console.log('[zap] getSwapTransaction: ', e);
        return 0;
    }

    if (transaction.statusCode === 400) {
        console.log(`[zap] ${transaction.description}`);
        return 0;
    }

    if (transaction.data.transaction === undefined) {
        console.log('[zap] transaction.tx is undefined');
        return 0;
    }

    console.log('Success get data from Odos!');
    return transaction.data.transaction;
}

async function setUp(params) {
    const account = await initWallet();

    let usdPlus = await getContract('UsdPlusToken', process.env.STAND);
    let usdc;
    if (process.env.STAND === 'base') {
        usdc = await getERC20('usdbc');
    } else {
        usdc = await getERC20('usdc');
    }
    let dai = await getERC20('dai');

    await transferETH(1000, account.address);
    await transferAsset(usdc.address, account.address);
    await transferAsset(dai.address, account.address);

    for (let tokenIn in params.inputTokens) {
        try {
            let token = await getERC20(tokenIn);
            await transferAsset(token.address, account.address);
        } catch (e) {
        }
    }

    await execTimelock(async (timelock) => {
        let exchangeUsdPlus = await usdPlus.exchange();
        let exchangeDaiPlus = await usdPlus.exchange();

        await usdPlus.connect(timelock).setExchanger(timelock.address);
        await usdPlus.connect(timelock).mint(account.address, toE6(10_000));
        await usdPlus.connect(timelock).setExchanger(exchangeUsdPlus);

        // await daiPlus.connect(timelock).setExchanger(timelock.address);
        // await daiPlus.connect(timelock).mint(account.address, toE18(10_000));
        // await daiPlus.connect(timelock).setExchanger(exchangeDaiPlus);
    });

    return {
        account: account,
        inputTokens: await Promise.all(params.inputTokens.map(async (token) => (await getERC20(token)).connect(account))),
    };
}
