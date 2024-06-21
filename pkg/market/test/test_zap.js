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

let zaps_aerodrome = [
    // {
    //     name: 'AerodromeZap',
    //     gauge: '0x87803Cb321624921cedaAD4555F07Daa0D1Ed325',
    //     token0Out: 'daiPlus',
    //     token1Out: 'usdPlus',
    //     token0In: 'usdbc',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'AerodromeZap',
    //     gauge: '0x969c70383A95704C6a35497d8C77BF38dc152e63',
    //     token0Out: 'dola',
    //     token1Out: 'usdPlus',
    //     token0In: 'usdbc',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'AerodromeZap',
    //     gauge: '0x9701A079C6e80D91CE4c464C4a996237A27FE537',
    //     token0Out: 'usdc',
    //     token1Out: 'usdPlus',
    //     token0In: 'usdbc',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'AerodromeZap',
    //     gauge: '0xEc4288995734ca01eAfC97588658F37515823502',
    //     token0Out: 'usdPlus',
    //     token1Out: 'sfrax',
    //     token0In: 'usdbc',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'AerodromeZap',
    //     gauge: '0x365f5413BBC783D1fff1cAe9D3Bd9A16eA698D19',
    //     token0Out: 'aero',
    //     token1Out: 'ovn',
    //     token0In: 'usdbc',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'AerodromeZap',
    //     gauge: '0xf09B1177d10775791d5806544AB51F1990Cb7c9A',
    //     token0Out: 'usdPlus',
    //     token1Out: 'eusd',
    //     token0In: 'usdbc',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'AerodromeZap',
    //     gauge: '0xcC5931E3f7ce8967Dcdc4BC5C7cfd5bF3d7Cf1FE',
    //     token0Out: 'usdPlus',
    //     token1Out: 'wstEth',
    //     token0In: 'usdbc',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'BeefyAerodromeZap',
    //     gauge: '0x661413c7baf43c53e6beff6567aad4b4f58bb10a',
    //     token0Out: 'usdPlus',
    //     token1Out: 'usdbc',
    //     token0In: 'daiPlus',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'CurveNGZap',
    //     gauge: '0xd68089d9daa2da7888b7ef54158480e09ecc3580',
    //     token0Out: 'usdPlus',
    //     token1Out: 'usdtPlus',
    //     token0In: 'usdc',
    //     token1In: 'frax',
    // },

    // {
    //     name: 'LynexZap',
    //     gauge: '0xEaf988C649f44c4DDFd7FDe1a8cB290569B66253',
    //     token0Out: 'usdc',
    //     token1Out: 'usdPlus',
    //     token0In: 'dai',
    //     token1In: 'usdt',
    // },
    // {
    //     name: 'LynexZap',
    //     gauge: '0x58AC068Eef3F49E019A88C7ecc9Ac2Fdd63fA755',
    //     token0Out: 'usdtPlus',
    //     token1Out: 'usdPlus',
    //     token0In: 'dai',
    //     token1In: 'usdt',
    // },
    // {
    //     name: 'AlienBaseZap',
    //     gauge: '0x52eaeCAC2402633d98b95213d0b473E069D86590',
    //     poolId: 7,
    //     token0Out: 'usdPlus',
    //     token1Out: 'usdbc',
    //     token0In: 'daiPlus',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'ArbidexZap',
    //     gauge: '0xd2bcFd6b84E778D2DE5Bb6A167EcBBef5D053A06',
    //     poolId: 8,
    //     token0Out: 'usdPlus',
    //     token1Out: 'usdc',
    //     token0In: 'daiPlus',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'BaseSwapZap',
    //     pair: '0x696b4d181Eb58cD4B54a59d2Ce834184Cf7Ac31A',
    //     gauge: '0xB404b32D20F780c7c2Fa44502096675867DecA1e',
    //     tokenId: 0,
    //     token0Out: 'usdPlus',
    //     token1Out: 'usdbc',
    //     token0In: 'daiPlus',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'ChronosZap',
    //     gauge: '0xcd4a56221175b88d4fb28ca2138d670cc1197ca9',
    //     token0Out: 'usdPlus',
    //     token1Out: 'daiPlus',
    //     token0In: 'usdc',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'DefiedgeZap',
    //     gauge: '0xd1c33d0af58eb7403f7c01b21307713aa18b29d3',
    //     chef: '0xD7cf8Dc79b15a61714061C5B7A1c12ddE9f3f088',
    //     pid: 0,
    //     token0Out: 'usdPlus',
    //     token1Out: 'usdc',
    //     token0In: 'daiPlus',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'DemetorZap',
    //     gauge: '0xC8F82e522BC5ca3C340753b69Cb18e68dA216362',
    //     token0Out: 'usds',
    //     token1Out: 'usdPlus',
    //     token0In: 'daiPlus',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'RamsesZap',
    //     gauge: '0x88d8D2bDC4f12862FbaBEA43cEc08B8FCD2234Da',
    //     token0Out: 'usdPlus',
    //     token1Out: 'daiPlus',
    //     token0In: 'usdc',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'SwapBasedZap',
    //     gauge: '0x1b0d1C09fD360ADe0Caf4bFfE2933E2CC8846a62', // USDbC+/USD+
    //     token0Out: 'usdPlus',
    //     token1Out: 'usdbc',
    //     token0In: 'daiPlus',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'ThenaZap',
    //     gauge: '0x31740dfF2D806690eDF3Ec72A2c301032a6265Bc',
    //     token0Out: 'usdt',
    //     token1Out: 'usdplus',
    //     token0In: 'usdc',
    // },
    // {
    //     name: 'VelocimeterZap',
    //     gauge: '0x0daf00a383f8897553ac1d03f4445b15afa1dcb9',
    //     token0Out: 'daiPlus',
    //     token1Out: 'usdPlus',
    //     token0In: 'usdbc',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'VelodromeZap',
    //     gauge: '0xC263655114CdE848C73B899846FE7A2D219c10a8',
    //     token0Out: 'usdPlus',
    //     token1Out: 'usdc',
    //     token0In: 'daiPlus',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'VelodromeZap',
    //     gauge: '0xfAc0Cf9e487356DDc72443061DFDB109885B04fD',
    //     token0Out: 'usdPlus',
    //     token1Out: 'ovn',
    //     token0In: 'usdt',
    //     token1In: 'usdc',
    // },
    // {
    //     name: 'BeefyVelodromeZap',
    //     gauge: '0x2bc96f9e07edc7f1aa9aa26e85dc7dd30ace59a6',
    //     token0Out: 'usdPlus',
    //     token1Out: 'usdc',
    //     token0In: 'daiPlus',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'ConvexZap',
    //     pair: '0xb34a7d1444a707349Bc7b981B7F2E1f20F81F013',
    //     token0In: 'dai',
    //     token1In: 'usdc',
    //     token0Out: 'usdPlus',
    //     token1Out: 'fraxbp',
    // },
    // {
    //     name: 'HorizaZap',
    //     pair: '0xcc78afeCe206D8432e687294F038B7dea1046B40',
    //     token0In: 'dai',
    //     token1In: 'daiPlus',
    //     token0Out: 'usdcCircle',
    //     token1Out: 'usdPlus',
    // },
    // {
    //     name: 'PancakeEqualWideZap', // deprecated
    //     pair: '0x721F37495cD70383B0A77Bf1eB8f97eef29498Bb',
    //     token0Out: 'usdcCircle',
    //     token1Out: 'usdPlus',
    //     token0In: 'dai',
    //     token1In: 'usdt',
    // },
    // {
    //     name: 'Pancake8020Zap',
    //     pair: '0x7e928afb59f5dE9D2f4d162f754C6eB40c88aA8E',
    //     token0In: 'usdc',
    //     token1In: 'usdPlus',
    //     token0Out: 'usdcCircle',
    //     token1Out: 'usdt',
    // },
    {
        name: 'AerodromeCLZap',
        pair: '0x0c1A09d5D0445047DA3Ab4994262b22404288A3B',
        token0Out: 'usdc',
        token1Out: 'usdPlus',
        token0In: 'sfrax',
        token1In: 'dai',
        priceRange: [4.5, 15],
    },
    // {
    //     name: 'AerodromeCLZap',
    //     pair: '0x96331Fcb46A7757854d9E26AFf3aCA2815D623fD',
    //     token0Out: 'dola',
    //     token1Out: 'usdPlus',
    //     token0In: 'sfrax',
    //     token1In: 'dai',
    //     priceRange: [0.5, 1.5],
    //     tickDelta: '0'
    // },
    // {
    //     name: 'AerodromeCLZap',
    //     pair: '0x4D69971CCd4A636c403a3C1B00c85e99bB9B5606',
    //     token0Out: 'weth',
    //     token1Out: 'usdPlus',
    //     token0In: 'sfrax',
    //     token1In: 'dai',
    //     priceRange: [1000.67143, 2000.11111],
    // },
    // {
    //     name: 'AerodromeCLZap',
    //     pair: '0x20086910E220D5f4c9695B784d304A72a0de403B',
    //     token0Out: 'usdPlus',
    //     token1Out: 'usdbc',
    //     token0In: 'sfrax',
    //     token1In: 'dai',
    //     priceRange: [0.989, 1.10001],
    // },
    // {
    //     name: 'LynexZap',
    //     gauge: '0x58AC068Eef3F49E019A88C7ecc9Ac2Fdd63fA755',
    //     token0Out: 'usdtPlus',
    //     token1Out: 'usdPlus',
    //     token0In: 'dai',
    //     token1In: 'usdt',
    // },
    // {
    //     name: 'AlienBaseZap',
    //     gauge: '0x52eaeCAC2402633d98b95213d0b473E069D86590',
    //     poolId: 7,
    //     token0Out: 'usdPlus',
    //     token1Out: 'usdbc',
    //     token0In: 'daiPlus',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'ArbidexZap',
    //     gauge: '0xd2bcFd6b84E778D2DE5Bb6A167EcBBef5D053A06',
    //     poolId: 8,
    //     token0Out: 'usdPlus',
    //     token1Out: 'usdc',
    //     token0In: 'daiPlus',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'BaseSwapZap',
    //     pair: '0x696b4d181Eb58cD4B54a59d2Ce834184Cf7Ac31A',
    //     gauge: '0xB404b32D20F780c7c2Fa44502096675867DecA1e',
    //     tokenId: 0,
    //     token0Out: 'usdPlus',
    //     token1Out: 'usdbc',
    //     token0In: 'daiPlus',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'ChronosZap',
    //     gauge: '0xcd4a56221175b88d4fb28ca2138d670cc1197ca9',
    //     token0Out: 'usdPlus',
    //     token1Out: 'daiPlus',
    //     token0In: 'usdc',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'DefiedgeZap',
    //     gauge: '0xd1c33d0af58eb7403f7c01b21307713aa18b29d3',
    //     chef: '0xD7cf8Dc79b15a61714061C5B7A1c12ddE9f3f088',
    //     pid: 0,
    //     token0Out: 'usdPlus',
    //     token1Out: 'usdc',
    //     token0In: 'daiPlus',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'DemetorZap',
    //     gauge: '0xC8F82e522BC5ca3C340753b69Cb18e68dA216362',
    //     token0Out: 'usds',
    //     token1Out: 'usdPlus',
    //     token0In: 'daiPlus',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'RamsesZap',
    //     gauge: '0x88d8D2bDC4f12862FbaBEA43cEc08B8FCD2234Da',
    //     token0Out: 'usdPlus',
    //     token1Out: 'daiPlus',
    //     token0In: 'usdc',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'SwapBasedZap',
    //     gauge: '0x1b0d1C09fD360ADe0Caf4bFfE2933E2CC8846a62', // USDbC+/USD+
    //     token0Out: 'usdPlus',
    //     token1Out: 'usdbc',
    //     token0In: 'daiPlus',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'ThenaZap',
    //     gauge: '0x31740dfF2D806690eDF3Ec72A2c301032a6265Bc',
    //     token0Out: 'usdt',
    //     token1Out: 'usdplus',
    //     token0In: 'usdc',
    // },
    // {
    //     name: 'VelocimeterZap',
    //     gauge: '0x0daf00a383f8897553ac1d03f4445b15afa1dcb9',
    //     token0Out: 'daiPlus',
    //     token1Out: 'usdPlus',
    //     token0In: 'usdbc',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'VelodromeZap',
    //     gauge: '0xC263655114CdE848C73B899846FE7A2D219c10a8',
    //     token0Out: 'usdPlus',
    //     token1Out: 'usdc',
    //     token0In: 'daiPlus',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'BeefyVelodromeZap',
    //     gauge: '0x2bc96f9e07edc7f1aa9aa26e85dc7dd30ace59a6',
    //     token0Out: 'usdPlus',
    //     token1Out: 'usdc',
    //     token0In: 'daiPlus',
    //     token1In: 'dai',
    // },
    // {
    //     name: 'ConvexZap',
    //     pair: '0xb34a7d1444a707349Bc7b981B7F2E1f20F81F013',
    //     token0In: 'dai',
    //     token1In: 'usdc',
    //     token0Out: 'usdPlus',
    //     token1Out: 'fraxbp',
    // },
    // {
    //     name: 'HorizaZap',
    //     pair: '0xcc78afeCe206D8432e687294F038B7dea1046B40',
    //     token0In: 'dai',
    //     token1In: 'daiPlus',
    //     token0Out: 'usdcCircle',
    //     token1Out: 'usdPlus',
    // },
    // {
    //     name: 'PancakeEqualWideZap', // deprecated
    //     pair: '0x721F37495cD70383B0A77Bf1eB8f97eef29498Bb',
    //     token0Out: 'usdcCircle',
    //     token1Out: 'usdPlus',
    //     token0In: 'dai',
    //     token1In: 'usdt',
    // },
    // {
    //     name: 'Pancake8020Zap',
    //     pair: '0x7e928afb59f5dE9D2f4d162f754C6eB40c88aA8E',
    //     token0In: 'usdc',
    //     token1In: 'usdPlus',
    //     token0Out: 'usdcCircle',
    //     token1Out: 'usdt',
    // },
];

let zaps_pancake = [
    // {
    //     name: 'PancakeCLZap',
    //     pair: '0x7e928afb59f5dE9D2f4d162f754C6eB40c88aA8E',
    //     token0In: 'usdc',
    //     token1In: 'usdPlus',
    //     token0Out: 'usdcCircle',
    //     token1Out: 'usdt',
    //     priceRange: [0.989, 1.10001],
    //     tickDelta: '0'
    // },
    // {
    //     name: 'PancakeCLZap',
    //     pair: '0x96331Fcb46A7757854d9E26AFf3aCA2815D623fD',
    //     token0Out: 'dola',
    //     token1Out: 'usdPlus',
    //     token0In: 'sfrax',
    //     token1In: 'dai',
    //     priceRange: [0.5, 1.5],
    // },
    // {
    //     name: 'PancakeCLZap',
    //     pair: '0x20086910E220D5f4c9695B784d304A72a0de403B',
    //     token0Out: 'usdPlus',
    //     token1Out: 'usdbc',
    //     token0In: 'sfrax',
    //     token1In: 'dai',
    //     priceRange: [0.989, 1.10001],
    // },
];

// TODO: remove hardcode
let zaps = zaps_aerodrome;

describe('Testing all zaps', function() {
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
        console.log(params.name);
        await deployments.fixture([params.name]);
        zap = await ethers.getContract(params.name);

        let setUpParams = await setUp(params);

        console.log("setUp done successfully")

        account = setUpParams.account;
        token0In = setUpParams.token0In;
        token1In = setUpParams.token1In;
        token0Out = setUpParams.token0Out;
        token1Out = setUpParams.token1Out;

        token0InDec = await token0In.decimals();
        token1InDec = await token1In.decimals();
        token0OutDec = await token0Out.decimals();
        token1OutDec = await token1Out.decimals();

        console.log(token0InDec, token1InDec, token0OutDec, token1OutDec);

        toToken0In = token0InDec == 6 ? toE6 : toE18;
        toToken1In = token1InDec == 6 ? toE6 : toE18;
        toToken0Out = token0OutDec == 6 ? toE6 : toE18;
        toToken1Out = token1OutDec == 6 ? toE6 : toE18;

        fromToken0In = token0InDec == 6 ? fromE6 : fromE18;
        fromToken1In = token1InDec == 6 ? fromE6 : fromE18;
        fromToken0Out = token0OutDec == 6 ? fromE6 : fromE18;
        fromToken1Out = token1OutDec == 6 ? fromE6 : fromE18;

        if ('priceRange' in params) { 
            curPriceRange = [...params.priceRange];

            curPriceRange[0] = Math.ceil(toE6(curPriceRange[0])).toString();
            curPriceRange[1] = Math.ceil(toE6(curPriceRange[1])).toString();

            params.priceRange = [...curPriceRange];
        }
    });

    it("swap and put nearly equal", async function () {
        console.log("price: ", await zap.getCurrentPrice(params.pair));

        const amountToken0In = toToken0In(1);
        const amountToken1In = toToken1In(1);
        const amountToken0Out = toToken0Out(1);
        const amountToken1Out = toToken1Out(5);

        await check(amountToken0In, amountToken1In, amountToken0Out, amountToken1Out);

        // let tickSpacing = (await zap.getTickSpacing(params.pair)).toString();
        // console.log("tickSpacing:", tickSpacing);
        // let currentTick = Number(await zap.getCurrentPoolTick(params.pair));
        // console.log("currentTick:", currentTick);
        //
        // await (await token0Out.approve(zap.address, toE18(1000000))).wait();
        // await (await token1Out.approve(zap.address, toE18(1000000))).wait();
        // console.log("approved");
        // await showBalances();
        // let tx = await (await zap.connect(account).mintTest(
        //     token0Out.address,
        //     token1Out.address,
        //     tickSpacing,
        //     currentTick,
        //     currentTick + 1,
        //     1000000,
        //     1000000
        // )).wait();
        // const mintTestEvent = tx.events.find((event) => event.event === "MintTest");
        // console.log("tokenId:", mintTestEvent.args.tokenId.toString());
        // console.log("liquidity:", mintTestEvent.args.liquidity.toString());
        // console.log("amountOut0:", mintTestEvent.args.amountOut0.toString());
        // console.log("amountOut1:", mintTestEvent.args.amountOut1.toString());
    });

    it("swap and disbalance on one asset", async function () {

        const amountToken0In = toToken0In(1);
        const amountToken1In = toToken1In(1);
        const amountToken0Out = toToken0Out(2);
        const amountToken1Out = toToken1Out(30);

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
        if ('priceRange' in params) {
            reserves = await zap.getProportion({amountsOut: [], ...params});
        } else if ('pair' in params) {
            reserves = await zap.getProportion(params.pair);
        } else if ('poolId' in params) {
            reserves = await zap.getProportion(params.gauge, params.poolId);
        } else {
            reserves = await zap.getProportion(params.gauge);
        }
        
        price = fromE6(await zap.getCurrentPrice(params.pair)).toFixed(0).toString();
        // console.log(price);

        const sumReserves = (reserves[0]).mul(price).add(reserves[1]);

        console.log("prop: ", reserves[0] / sumReserves);
        console.log("prop with price: ", ((reserves[0]).mul(price).div(sumReserves)).toString());
        

        const proportions = calculateProportionForPool({
            inputTokensDecimals: [token0InDec, token1InDec],
            inputTokensAddresses: [token0In.address, token1In.address],
            inputTokensAmounts: [amountToken0In, amountToken1In],
            inputTokensPrices: [1, 1],
            // inputTokensDecimals: [],
            // inputTokensAddresses: [],
            // inputTokensAmounts: [],
            // inputTokensPrices: [await getOdosAmountOutOnly(token0In, dai, token0InDec, account.address), await getOdosAmountOutOnly(token1In, dai, token1InDec, account.address)],
            outputTokensDecimals: [token0OutDec, token1OutDec],
            outputTokensAddresses: [token0Out.address, token1Out.address],
            outputTokensAmounts: [amountToken0Out, amountToken1Out],
            outputTokensPrices: [1, 1], // TODO: fix prices
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


        // console.log("St")

        // console.log(inputTokens, outputTokens, request.data, [proportions.amountToken0Out, proportions.amountToken1Out], params);

        // console.log("END")
        let swapData = {
            inputs: inputTokens,
            outputs: outputTokens,
            data: request.data
        };
        console.log("swap data:", swapData);
        let price = await (await zap.connect(account).zapIn(
            swapData,
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

            price = await (await zap.connect(account).zapIn(
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

        // console.log(`Transaction was mined in block ${receipt.blockNumber}`);

        await showBalances();

        const inputTokensEvent = price.events.find((event) => event.event === "InputTokens");
        const outputTokensEvent = price.events.find((event) => event.event === "OutputTokens");
        const putIntoPoolEvent = price.events.find((event) => event.event === "PutIntoPool");
        const returnedToUserEvent = price.events.find((event) => event.event === "ReturnedToUser");
        let mintEvent;

        if ('priceRange' in params) {
            mintEvent = price.events.find((event) => event.event === "IncreaseLiquidity");
        }


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
        const proportion0 = reserves[0] / reserves[0].add(reserves[1]);
        const proportion1 = reserves[1] / reserves[0].add(reserves[1]);
        const putTokenAmount0 = fromToken0Out(putIntoPoolEvent.args.amountsPut[0]);
        const putTokenAmount1 = fromToken1Out(putIntoPoolEvent.args.amountsPut[1]);

        console.log(proportion0, proportion1, putTokenAmount0, putTokenAmount1);

        console.log("prop0: ", proportion0);
        console.log("prop1: ", putTokenAmount0 / (putTokenAmount0 + putTokenAmount1));
        expect(Math.abs(proportion0 - putTokenAmount0 / (putTokenAmount0 + putTokenAmount1))).to.lessThan(0.05);
        expect(Math.abs(proportion1 - putTokenAmount1 / (putTokenAmount0 + putTokenAmount1))).to.lessThan(0.05);

        // 2) Общая сумма вложенного = (общей сумме обмененного - допустимый slippage)
        const inTokenAmount0 = fromToken0In(inputTokensEvent.args.amountsIn[0])
        const inTokenAmount1 = fromToken1In(inputTokensEvent.args.amountsIn[1])
        const outTokenAmount0 = fromToken0Out(outputTokensEvent.args.amountsOut[0])
        const outTokenAmount1 = fromToken1Out(outputTokensEvent.args.amountsOut[1])

        console.log(inTokenAmount0, inTokenAmount1, putTokenAmount0, putTokenAmount1);

        expect(fromToken0In(await token0In.balanceOf(zap.address))).to.lessThan(1);
        expect(fromToken1In(await token1In.balanceOf(zap.address))).to.lessThan(1);
        expect(fromToken0Out(await token0Out.balanceOf(zap.address))).to.lessThan(1);
        expect(fromToken1Out(await token1Out.balanceOf(zap.address))).to.lessThan(1);

        
        if ('priceRange' in params) {

            console.log((await zap.getCurrentPrice('0x96331Fcb46A7757854d9E26AFf3aCA2815D623fD')).toString());

            price = await zap.getCurrentPrice(params.pair);
            console.log(price.toString());

            let price0 = parseInt(params.priceRange[0]);
            let price1 = parseInt(params.priceRange[1]);
            
            if (price0 > price || price1 < price) {
                expect(putTokenAmount0 * putTokenAmount1).to.equals(0);
                console.log(price.toString());
            }
            
        }
        
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
    console.log("signers:", signers);

    let usdPlus = await getContract('UsdPlusToken', process.env.STAND);
    // let daiPlus = await getContract('UsdPlusToken', process.env.STAND + '_dai');

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
        let exchangeDaiPlus = await usdPlus.exchange();

        await usdPlus.connect(timelock).setExchanger(timelock.address);
        await usdPlus.connect(timelock).mint(account.address, toE6(10_000));
        await usdPlus.connect(timelock).setExchanger(exchangeUsdPlus);

        // await daiPlus.connect(timelock).setExchanger(timelock.address);
        // await daiPlus.connect(timelock).mint(account.address, toE18(10_000));
        // await daiPlus.connect(timelock).setExchanger(exchangeDaiPlus);
    })

    return {
        account: account,
        token0Out: (await getERC20(params.token0Out)).connect(account),
        token1Out: (await getERC20(params.token1Out)).connect(account),
        token0In: (await getERC20(params.token0In)).connect(account),
        token1In: (await getERC20(params.token1In)).connect(account),
    }
}
