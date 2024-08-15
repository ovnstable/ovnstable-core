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
    let airdrop;


    sharedBeforeEach('deploy and setup', async () => {
        // need to run inside IDEA via node script running
        await hre.run("compile");
        await resetHardhat("OPTIMISM");

        await deployments.fixture(['Airdrop']);

        account = await setUp();
        airdrop = (await ethers.getContract("Airdrop")).connect(account);
        usdPlus = (await getContract('UsdPlusToken', 'optimism')).connect(account);
    });


    it("airdrop usd+", async function () {

        await showBalances();

        await (await usdPlus.approve(airdrop.address, await usdPlus.balanceOf(account.address))).wait();
        const mapper = [];
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
            const premapping = [];
            for (let i = 0; i < addressesList.length; i++) {
                premapping.push({
                    "address": addressesList[i],
                    "balanceBefore": fromE6(await usdPlus.balanceOf(addressesList[i])),
                    "amount": fromE6(amountsList[i])
                })
            }

            const tx = await airdrop.connect(account).airdrop(
                usdPlus.address,
                addressesList,
                amountsList
            );
            console.log(`Transaction hash: ${tx.hash}`);
            await new Promise((f) => setTimeout(f, 2000));
            const receipt = await tx.wait();
            for (let i = 0; i < premapping.length; i++) {
                mapper.push({
                    "address": premapping[i].address,
                    "balanceBefore": premapping[i].balanceBefore,
                    "amount": premapping[i].amount,
                    "balanceAfter": fromE6(await usdPlus.balanceOf(premapping[i].address)),
                    "txHash": tx.hash,
                    "blockNumber": receipt.blockNumber,
                })
            }
            // console.log(`Transaction was mined in block ${receipt.blockNumber}`);

            const events = receipt.events;
            // console.log(events)
        }
        fs.writeFileSync("OVNAirdropResult.json", JSON.stringify(mapper, null, 2))


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
