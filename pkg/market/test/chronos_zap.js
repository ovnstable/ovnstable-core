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
const { resetHardhat, greatLess, resetHardhatToLastBlock} = require("@overnight-contracts/common/utils/tests");
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

        const amountToken0In = toE6(amountIn);
        const amountToken1In = toE18(amountIn);

        await (await token0In.approve(chronosZap.address, amountToken0In)).wait();
        await (await token1In.approve(chronosZap.address, amountToken1In)).wait();

        const reserves = await chronosZap.getProportion(gauge);

        const sumReserves = reserves[0].add(reserves[1])
        console.log(reserves[0] / 1e18, reserves[1] / 1e18, reserves[2] / 1e18, sumReserves / 1e18)
        console.log("proportion", reserves[0] / sumReserves, "proportion", reserves[1] / sumReserves)

        const request = await getOdosRequest({
            "chainId": 42161,
            "inputTokens": [
                {
                    "tokenAddress": token0In.address,
                    "amount": amountToken0In
                },
                {
                    "tokenAddress": token1In.address,
                    "amount": amountToken1In
                }
            ],
            "outputTokens": [
                {
                    "tokenAddress": token0Out.address,
                    "proportion": reserves[0] / sumReserves
                },
                {
                    "tokenAddress": token1Out.address,
                    "proportion": reserves[1] / sumReserves
                },

            ],
            "gasPrice": 20,
            "userAddr": chronosZap.address,
            "slippageLimitPercent": 0.3,
        });


        const receipt = await (await chronosZap.connect(account).zapIn({
            inputs: [
                {
                    tokenAddress: token0In.address,
                    amountIn: amountToken0In,
                },
                {
                    tokenAddress: token1In.address,
                    amountIn: amountToken1In,
                },
            ],
            outputs: [
                {
                    tokenAddress: token0Out.address,
                    receiver: chronosZap.address,
                },
                {
                    tokenAddress: token1Out.address,
                    receiver: chronosZap.address,
                },
            ],
            data: request.data
        }, gauge)).wait();

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

    });


    async function showBalances() {

        const items = [];

        items.push({
            name: await token0In.symbol(),
            balance: fromE6(await token0In.balanceOf(account.address))
        });

        items.push({
            name:  await token1In.symbol(),
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
