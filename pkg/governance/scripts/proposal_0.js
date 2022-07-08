const hre = require("hardhat");

const {getContract, showM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');

let nUsdLPToken = '0x7479e1Bc2F2473f9e78c89B4210eb6d55d33b645';
let synToken = '0xf8F9efC0db77d8881500bb06FF5D6ABc3070E695';
let swap = '0x85fCD7Dd0a1e1A9FCD5FD886ED522dE8221C3EE5';
let miniChefV2 = '0x7875Af1a6878bdA1C129a4e2356A3fD040418Be5';
let sushiSwapRouter = '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506';
let pid = 1;
let dystopiaRouter = '0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e';


async function main() {

    // await test();
    await proposal();

}

async function test() {

    await execTimelock(async (timelock) => {

        await showM2M();

        let strategySynapseUsdc = await getContract('StrategySynapseUsdc' );
        await strategySynapseUsdc.connect(timelock).upgradeTo('0x2E6E4356437f8955138C9F4B2D7981Ee458133b6');
        await strategySynapseUsdc.connect(timelock).setTokens(POLYGON.usdc, nUsdLPToken, synToken, POLYGON.usdPlus);
        await strategySynapseUsdc.connect(timelock).setParams(swap, miniChefV2, sushiSwapRouter, pid, dystopiaRouter);

        let exchange = await getContract('Exchange');

        await (await exchange.connect(timelock).setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60)).wait();
        let tx = await (await exchange.payout()).wait();

        const amount = tx.events.find((e) => e.event == 'Harvest').args.amount;
        console.log('Syn: ' + amount.toString())

        await showM2M();
    });
}

async function proposal() {

    let strategySynapseUsdc = await getContract('StrategySynapseUsdc');

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(strategySynapseUsdc.address);
    values.push(0);
    abis.push(strategySynapseUsdc.interface.encodeFunctionData('upgradeTo', ['0x391670F093050c08c1D220b03d160c2eA37B457f']));

    addresses.push(strategySynapseUsdc.address);
    values.push(0);
    abis.push(strategySynapseUsdc.interface.encodeFunctionData('setTokens', [POLYGON.usdc, nUsdLPToken, synToken, POLYGON.usdPlus]));

    addresses.push(strategySynapseUsdc.address);
    values.push(0);
    abis.push(strategySynapseUsdc.interface.encodeFunctionData('setParams', [swap, miniChefV2, sushiSwapRouter, pid, dystopiaRouter]));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

