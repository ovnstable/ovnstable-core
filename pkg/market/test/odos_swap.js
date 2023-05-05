const { expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { transferAsset, getERC20, transferETH, initWallet, execTimelock, getContract } = require("@overnight-contracts/common/utils/script-utils");
const { resetHardhat, greatLess } = require("@overnight-contracts/common/utils/tests");
const BN = require("bn.js");
const hre = require("hardhat");
let { OPTIMISM, POLYGON } = require('@overnight-contracts/common/utils/assets');
const { sharedBeforeEach } = require("@overnight-contracts/common/utils/sharedBeforeEach");
const { fromE6, fromE18, toAsset, toE6, toE18 } = require("@overnight-contracts/common/utils/decimals");


describe("OdosSwap", function () {

    let account;
    let usdPlus;
    let daiPlus;
    let odosSwap;
    let usdc;
    let dai;
    let odos;


    sharedBeforeEach('deploy and setup', async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");
        await resetHardhat("OPTIMISM");

        await deployments.fixture(['OdosSwap']);

        account = await setUp();
        odosSwap = await ethers.getContract("OdosSwap");
        // odos = await ethers.getContract("Odos");

        usdPlus = await getContract('UsdPlusToken', 'optimism');
        daiPlus = await getContract('UsdPlusToken', 'optimism_dai');

        usdc = await getERC20("usdc");
        dai = await getERC20("dai");
    });


    it("swap usdc to usd+", async function () {

        await showBalances();


        let approveTx = await usdc.approve("0x4bdE8Be121D80349662CB98BE900D5d03A78CACf", 1300000000);
        console.log(`Transaction hash: ${approveTx.hash}`);

        let approveReceipt = await approveTx.wait();
        console.log(`Transaction was mined in block ${approveReceipt.blockNumber}`);

        approveTx = await usdc.approve("0x69Dd38645f7457be13571a847FfD905f9acbaF6d", 1300000000);
        console.log(`Transaction hash: ${approveTx.hash}`);

        approveReceipt = await approveTx.wait();
        console.log(`Transaction was mined in block ${approveReceipt.blockNumber}`);

        const tx = await odosSwap.connect(account).swap({
            router: "0x69Dd38645f7457be13571a847FfD905f9acbaF6d",
            inputs: [{
                tokenAddress: "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
                amountIn: 130000000,
                receiver: "0x69Dd38645f7457be13571a847FfD905f9acbaF6d",
                permit: []
            }],
            outputs: [{
                tokenAddress: "0x73cb180bf0521828d8849bc8CF2B920918e23032",
                relativeValue: 1,
                receiver: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            }],
            executor: "0x4bdE8Be121D80349662CB98BE900D5d03A78CACf",
            valueOutQuote: toE6(130),
            valueOutMin: toE6(129),
            data: "0xf17a454600000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000002a01325456c92300649fc000000000000000000000000000000000000000000029e0efdfdcab5a00000000000000000000000000000000004bde8be121d80349662cb98be900d5d03a78cacf0000000000000000000000000000000000000000000000000000000000000240000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000007f5c764cbc14f9669b88837ca1490cca17c316070000000000000000000000000000000000000000000000000000000007bfa480000000000000000000000000207addb05c548f262219f6bfc6e11c02d0f7fdbe000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000073cb180bf0521828d8849bc8cf2b920918e230320000000000000000000000000000000000000000000000056c1c882fb55a4000000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000000000000000000000000000000000000000000007001020500100102000203010210000100010400ff0000000000000000000000008a9cd3dce710e90177b4332c108e159a15736a0f207addb05c548f262219f6bfc6e11c02d0f7fdbe7f5c764cbc14f9669b88837ca1490cca17c31607c40f949f8a4e094d1b49a23ea9241d289b7b281900000000000000000000000000000000"
        });
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



async function getPlusTokens(amount, to) {

    let usdPlus = await getContract('UsdPlusToken', 'optimism');
    let daiPlus = await getContract('UsdPlusToken', 'optimism_dai');

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

    await transferAsset(OPTIMISM.dai, account.address);
    await transferAsset(OPTIMISM.usdc, account.address);

    await getPlusTokens(10_000, account.address);

    return account;

}
