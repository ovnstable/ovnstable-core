const { expect } = require('chai');
const { deployments, ethers, getNamedAccounts } = require('hardhat');
const {
    transferAsset,
    getERC20,
    transferETH,
    initWallet,
    execTimelock,
    getContract,
    getChainId,
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
    {
        name: 'AerodromeCLZap',
        pair: '0x20086910E220D5f4c9695B784d304A72a0de403B',
        inputTokens: ['dai', 'usdPlus'],
        priceRange: [1, 1.00022],
    },
    // {
    //     name: 'AerodromeCLZap',
    //     pair: '0x4D69971CCd4A636c403a3C1B00c85e99bB9B5606',
    //     inputTokens: ['dai', 'usdPlus'],
    //     priceRange: [3100, 3500],
    // },
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
                await check();
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

            async function check() {
                let tokenId = 43981;
                let inputSwapTokens = [];
                for (let i = 0; i < inputTokens.length; i++) {
                    await (await inputTokens[i].approve(zap.address, toE18(10000))).wait();
                    inputSwapTokens.push({
                        "tokenAddress": inputTokens[i].address,
                        "amount": amounts[i],
                        "price": prices[i],
                    });
                }
                console.log("inputSwapTokens:", inputSwapTokens);
                let result = await zap.getProportionForZap(params.pair, params.tickRange, inputSwapTokens);
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
                let price = await (await zap.connect(account).zapIn(swapData, aerodromeData)).wait();
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
        });
    });
});

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
