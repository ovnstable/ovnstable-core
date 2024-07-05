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
                let positions = await zap.getPositions("0x66BC0120b3287f08408BCC76ee791f0bad17Eeef");
                for (let i = 0; i < positions.length; i++) {
                    console.log("platform:", positions[i].platform);
                    console.log("tokenId:", positions[i].tokenId.toString());
                    console.log("poolId:", positions[i].poolId.toString());
                    console.log("token0:", positions[i].token0.toString());
                    console.log("token1:", positions[i].token1.toString());
                    console.log("amount0:", positions[i].amount0.toString());
                    console.log("amount1:", positions[i].amount1.toString());
                    console.log("rewardAmount0:", positions[i].rewardAmount0.toString());
                    console.log("rewardAmount1:", positions[i].rewardAmount1.toString());
                    console.log("tickLower:", positions[i].tickLower.toString());
                    console.log("tickUpper:", positions[i].tickUpper.toString());
                    console.log("apr:", positions[i].apr.toString());
                    console.log("----------------------------------");
                }
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
