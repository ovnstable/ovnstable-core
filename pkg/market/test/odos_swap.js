const { expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { transferAsset, getERC20, transferETH, initWallet, execTimelock, getContract} = require("@overnight-contracts/common/utils/script-utils");
const { resetHardhat, greatLess } = require("@overnight-contracts/common/utils/tests");
const BN = require("bn.js");
const hre = require("hardhat");
let { OPTIMISM, POLYGON } = require('@overnight-contracts/common/utils/assets');
const { sharedBeforeEach } = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {fromE6, fromE18, toAsset, toE6, toE18} = require("@overnight-contracts/common/utils/decimals");


describe("OdosSwap", function () {

    let account;
    let usdPlus;
    let daiPlus;
    let odosSwap;
    let usdc;
    let dai;


    sharedBeforeEach('deploy and setup', async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");
        await resetHardhat("OPTIMISM");

        await deployments.fixture(['OdosSwap']);

        account = await setUp();
        odosSwap = await ethers.getContract("OdosSwap");

        usdPlus = await getContract('UsdPlusToken', 'optimism');
        daiPlus = await getContract('UsdPlusToken', 'optimism_dai');

        usdc = await getERC20("usdc");
        dai = await getERC20("dai");
    });


    it("swap usdc to usd+", async function () {

        await showBalances();

        const tx = await odosSwap.connect(account).swap({
            router: "0x69Dd38645f7457be13571a847FfD905f9acbaF6d",
            inputs: [{
                tokenAddress: "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
                amountIn: 13000000,
                receiver: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                permit: []
            }],
            outputs: [{
                tokenAddress: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
                relativeValue: 1,
                receiver: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            }],
            executor: account.address,
            valueOutQuote: 1309376945133482,
            valueOutMin: 1608305435052344,
            data: "0xf17a454600000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000003b292960491cea47695c000000000000000000000000000000000000000000003afbb9e459471200000000000000000000000000000000004bde8be121d80349662cb98be900d5d03a78cacf0000000000000000000000000000000000000000000000000000000000000240000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000200000000000000000000000007f5c764cbc14f9669b88837ca1490cca17c31607000000000000000000000000000000000000000000000000000000000ae85bc00000000000000000000000004bde8be121d80349662cb98be900d5d03a78cacf0000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000da10009cbd5d07dd0cecc66161fc93d7c9000da10000000000000000000000000000000000000000000000000000000005f65606000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000000000000000000000000000000000000000000011c070204000e010001023b87eed5a8f40b81ebd8a01ac1891f04cb59fd6600000000000000000000000000000000000000000000000000000000000000000ae85bc00000000000000000000000000ae7ccc8000000006453953c00000187e67e598a0567616e64616c6674686562726f776e67786d786e6900188817718a922f00000bc8541ebba568a7a776102913aa300c6b021e4e075039c44da20d649373debb3b64e4e3a98fe8ba4db4133f61f241c94f11179df3ba788ccb7dca7e8a6f0c371b020c0001030201ff000000000000000000000000000000000000000000007f5c764cbc14f9669b88837ca1490cca17c3160794b008aa00579c1307b0ef2c499ad98a8ce58e588323d063b1d12acce4742f1e3ed9bc46d71f422200000000"
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


    async function showBalances(){

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



async function getPlusTokens(amount, to){

    let usdPlus = await getContract('UsdPlusToken', 'optimism');
    let daiPlus = await getContract('UsdPlusToken', 'optimism_dai');

    await execTimelock(async (timelock)=>{
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
