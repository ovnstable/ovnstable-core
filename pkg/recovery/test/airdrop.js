const { expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { transferAsset, getERC20, transferETH, initWallet, execTimelock, getContract } = require("@overnight-contracts/common/utils/script-utils");
const { resetHardhat, greatLess } = require("@overnight-contracts/common/utils/tests");
const BN = require("bn.js");
const hre = require("hardhat");
const readline = require('readline');
const fs = require('fs');
let { OPTIMISM, POLYGON } = require('@overnight-contracts/common/utils/assets');
const { sharedBeforeEach } = require("@overnight-contracts/common/utils/sharedBeforeEach");
const { fromE6, fromE18, toAsset, toE6, toE18 } = require("@overnight-contracts/common/utils/decimals");


describe("Airdrop", function () {

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

        // await deployments.fixture(['airdrop']);
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();
        account = deployer;

        // await deployments.fixture(['test']);

        airdrop = await deploy("Airdrop", {
            from: deployer,
            args: [],
            log: true,
            skipIfAlreadyDeployed: true
        });

        account = await setUp();
        airdrop = await ethers.getContract("Airdrop");
        usdPlus = await getContract('UsdPlusToken', 'optimism');
    });


    it("airdrop usd+", async function () {

        await showBalances();


        let approveTx = await usdPlus.approve(airdrop.address, 1e15);
        console.log(`Transaction hash: ${approveTx.hash}`);

        let approveReceipt = await approveTx.wait();
        console.log(`Transaction was mined in block ${approveReceipt.blockNumber}`);

        console.log(airdrop.address)

        const csvFile = fs.readFileSync('OVNUSDPAirdrop.csv', 'utf-8');
        const lines = csvFile.split('\n');
        const airdropInfo = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const [address, amount] = line.split(',');
                airdropInfo.push({ address, amount: parseInt(amount) });
            }
        }
        const addressesPerTxn = 100;
        const totalTransactions = Math.ceil(airdropInfo.length / addressesPerTxn);
        console.log(totalTransactions)

        for (let i = 0; i < totalTransactions; i++) {
            const currentInfos = airdropInfo.slice(i * addressesPerTxn, (i * addressesPerTxn) + addressesPerTxn);
            const addressesList = currentInfos.map(info => ethers.utils.getAddress(info.address));
            const amountsList = currentInfos.map(info => info.amount);

            const tx = await airdrop.connect(account).airdrop(
                usdPlus.address,
                addressesList,
                amountsList
            );
            // console.log(`Transaction hash: ${tx.hash}`);

            const receipt = await tx.wait();
            // console.log(`Transaction was mined in block ${receipt.blockNumber}`);

            const events = receipt.events;
            console.log(events)
        }


        await showBalances();

    });


    async function showBalances() {

        const items = [];

        items.push({
            name: 'USD+',
            balance: fromE6(await usdPlus.balanceOf(account.address))
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

    await getPlusTokens(303_541, account.address);

    return account;

}
