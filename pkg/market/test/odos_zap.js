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
const { resetHardhat, greatLess } = require("@overnight-contracts/common/utils/tests");
const BN = require("bn.js");
const hre = require("hardhat");
let { ARBITRUM } = require('@overnight-contracts/common/utils/assets');
const { sharedBeforeEach } = require("@overnight-contracts/common/utils/sharedBeforeEach");
const { fromE6, fromE18, toAsset, toE6, toE18 } = require("@overnight-contracts/common/utils/decimals");

const chronosPairAbi = require("@overnight-contracts/pools/abi/ChronosPair.json")
const axios = require("axios");


const ODOS_ROUTER = '0xdd94018F54e565dbfc939F7C44a16e163FaAb331';

describe("odosZap", function () {

    let account;
    let usdPlus;
    let daiPlus;
    let chronosZapper;
    let usdc;
    let dai;
    let chronosPair;
    let chronosGauge;


    sharedBeforeEach('deploy and setup', async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");
        await resetHardhat("ARBITRUM");

        await deployments.fixture(['OdosZapper']);

        account = await setUp();
        chronosZapper = await ethers.getContract("ChronosZapper");


        // chronosPair = await ethers.getContractAt(chronosPairAbi, "0xfd1e3458C7a1D3506f5cC6180A53F1e60f9D6BEa")

        // odos = await ethers.getContract("Odos");


        usdPlus = (await getContract('UsdPlusToken', 'arbitrum')).connect(account);
        daiPlus = (await getContract('UsdPlusToken', 'arbitrum_dai')).connect(account);

        usdc = (await getERC20("usdc")).connect(account);
        dai = (await getERC20("dai")).connect(account);
    });


    // it("swap usdc to usd+", async function () {

    //     await showBalances();

    //     const amountUsdc = toE6(10000);
    //     const amountDai = toE18(10000);

    //     await (await usdc.approve(chronosZapper.address, amountUsdc)).wait();
    //     await (await dai.approve(chronosZapper.address, amountDai)).wait();

    //     const request = await getOdosRequest({
    //         "chainId": 42161,
    //         "inputTokens": [
    //             {
    //                 "tokenAddress": usdc.address,
    //                 "amount": amountUsdc
    //             },
    //             {
    //                 "tokenAddress": dai.address,
    //                 "amount": amountDai
    //             }
    //         ],
    //         "outputTokens": [
    //             {
    //                 "tokenAddress": usdPlus.address,
    //                 "proportion": 1
    //             },

    //         ],
    //         "gasPrice": 20,
    //         "userAddr": account.address,
    //         "slippageLimitPercent": 0.3,
    //     });

    //     const tx = await chronosZapper.connect(account).swap({
    //         router: ODOS_ROUTER,
    //         inputs: [
    //             {
    //                 tokenAddress: usdc.address,
    //                 amountIn: amountUsdc,
    //             },
    //             {
    //                 tokenAddress: dai.address,
    //                 amountIn: amountDai,
    //             },
    //         ],
    //         outputs: [{
    //             tokenAddress: usdPlus.address,
    //             receiver: account.address,
    //         }],
    //         executor: "0x1F635E0e79016E2Cf89B31611d13646EC538E8C1",
    //         data: request.data
    //     });
    //     console.log(`Transaction hash: ${tx.hash}`);

    //     const receipt = await tx.wait();
    //     console.log(`Transaction was mined in block ${receipt.blockNumber}`);

    //     await showBalances();

    //     // Retrieve event logs
    //     const inputTokensEvent = receipt.events.find((event) => event.event === "InputTokens");
    //     // const outputTokensEvent = receipt.events.find((event) => event.event === "OutputTokens");
    //     // const putIntoPoolEvent = receipt.events.find((event) => event.event === "PutIntoPool");
    //     // const returnedToUserEvent = receipt.events.find((event) => event.event === "ReturnedToUser");

    //     console.log(`Input tokens: ${inputTokensEvent.args.amountsIn} ${inputTokensEvent.args.tokensIn}`);
    //     // console.log(`Output tokens: ${outputTokensEvent.args.amountsOut} ${outputTokensEvent.args.tokensOut}`);
    //     // console.log(`Tokens put into pool: ${putIntoPoolEvent.args.amountsPut} ${putIntoPoolEvent.args.tokensPut}`);
    //     // console.log(`Tokens returned to user: ${returnedToUserEvent.args.amountsReturned} ${returnedToUserEvent.args.tokensReturned}`);


    // });

    it("swap usdc/dai to usd+/dola and put to chronos", async function () {

        await showBalances();

        const amountUsdc = toE6(10);
        const amountDai = toE18(10);

        await (await usdPlus.approve(chronosZapper.address, amountUsdc)).wait();
        await (await daiPlus.approve(chronosZapper.address, amountDai)).wait();

        const reserves = await chronosZapper.getProportion("0xd3b8de04b90b4bae249e5f0b30ae98d7f02b6dab");

        // const daiAmount = fromE18(reserves[0])
        // const usdcAmount = fromE6(reserves[1])
        // const sumReserves = usdcAmount + daiAmount

        const sumReserves = reserves[0].add(reserves[1])
        console.log(reserves[0] / 1e18, reserves[1] / 1e18, reserves[2] / 1e18, sumReserves / 1e18)
        console.log("proportion", reserves[0] / sumReserves, "proportion", reserves[1] / sumReserves)

        const request = await getOdosRequest({
            "chainId": 42161,
            "inputTokens": [
                {
                    "tokenAddress": usdPlus.address,
                    "amount": amountUsdc
                },
                {
                    "tokenAddress": daiPlus.address,
                    "amount": amountDai
                }
            ],
            "outputTokens": [
                {
                    "tokenAddress": dai.address,
                    "proportion": reserves[0] / sumReserves
                },
                {
                    "tokenAddress": usdc.address,
                    "proportion": reserves[1] / sumReserves
                },

            ],
            "gasPrice": 20,
            "userAddr": chronosZapper.address,
            "slippageLimitPercent": 0.3,
        });

        const txSet = await chronosZapper.connect(account).setRouters(ODOS_ROUTER, ARBITRUM.chronosRouter);

        const receiptSet = await txSet.wait();

        const tx = await chronosZapper.connect(account).zapIn({
            inputs: [
                {
                    tokenAddress: usdPlus.address,
                    amountIn: amountUsdc,
                },
                {
                    tokenAddress: daiPlus.address,
                    amountIn: amountDai,
                },
            ],
            outputs: [
                {
                    tokenAddress: dai.address,
                    receiver: chronosZapper.address,
                },
                {
                    tokenAddress: usdc.address,
                    receiver: chronosZapper.address,
                },
            ],
            data: request.data
        }, "0xd3b8de04b90b4bae249e5f0b30ae98d7f02b6dab");
        console.log(`Transaction hash: ${tx.hash}`);

        const receipt = await tx.wait();
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


    });


    async function showBalances() {

        const items = [];

        items.push({
            name: 'USD+',
            balance: fromE6(await usdPlus.balanceOf(account.address))
        });

        items.push({
            name: 'DAI+',
            balance: fromE18(await daiPlus.balanceOf(account.address))
        });

        items.push({
            name: 'DAI',
            balance: fromE18(await dai.balanceOf(account.address))
        });

        items.push({
            name: 'USDC',
            balance: fromE6(await usdc.balanceOf(account.address))
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
    // {
    // "chainId": 10,
    // "inputTokens": [
    // {
    // "tokenAddress": "0x73cb180bf0521828d8849bc8CF2B920918e23032",
    // "amount": 183000000000
    // }
    // ],
    // "outputTokens": [
    // {
    // "tokenAddress": "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    // "proportion": 1
    // }
    // ],
    // "gasPrice": 20,
    // "userAddr": "0x47E2D28169738039755586743E2dfCF3bd643f86",
    // "slippageLimitPercent": 0.3,
    // "sourceBlacklist": ["Hashflow"],
    // "sourceWhitelist": [],
    // "simulate": false,
    // "pathViz": false,
    // "disableRFQs": false
    // }

    // @ts-ignore
    const url = 'https://api.overnight.fi/root/odos/sor/swap';
    let transaction;
    try {
        transaction = (await axios.post(url, swapParams, { headers: { "Accept-Encoding": "br" } }));
    } catch (e) {
        console.log("[chronosZapper] getSwapTransaction: " + e);
        return 0;
    }

    if (transaction.statusCode === 400) {
        console.log(`[chronosZapper]  ${transaction.description}`);
        return 0;
    }

    if (transaction.data.transaction === undefined) {
        console.log("[chronosZapper] transaction.tx is undefined");
        return 0;
    }

    console.log('Success get data from Odos!');
    return transaction.data.transaction;
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
