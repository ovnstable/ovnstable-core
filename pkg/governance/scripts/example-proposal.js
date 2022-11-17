const hre = require("hardhat");


const {getContract, showM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");


async function main() {

    await test();
//    await proposal();

}

async function test(){

    await execTimelock(async (timelock)=>{

        await showM2M();

        let StrategyWombexBusd = await getContract('StrategyWombexBusd');
        let StrategyWombexUsdc = await getContract('StrategyWombexUsdc');
        let StrategyWombexUsdt = await getContract('StrategyWombexUsdt');
/*
        let exchange = await getContract('Exchange');

        let listener = await getContract('AvalanchePayoutListener');
*/
        await StrategyWombexBusd.connect(timelock).upgradeTo('0xd23682c0e8f58f788263050a6229D1AB272141F2');
        await StrategyWombexUsdc.connect(timelock).upgradeTo('0x3dB8C161fe6F9b40A4bF40dF77753Bad6C9f4Ed8');
        await StrategyWombexUsdt.connect(timelock).upgradeTo('0xf4b175330De5671Cb7F13F8CF1Dcb2Fff6E7c7E3');

        await showM2M();
/*
        await exchange.connect(timelock).upgradeTo('0xde13EbA3109336E43533CbCA0F3817928F40734E');
        await exchange.connect(timelock).setPayoutListener(listener.address);

        await exchange.connect(timelock).setAbroad(1000100, 1000350);

        await (await exchange.payout()).wait();

        await showM2M();*/
    });
}


async function proposal(){

    let ehidna = await getContract('StrategyEchidnaUsdc');
    let vector= await getContract('StrategyVectorUsdc');

    let exchange = await getContract('Exchange');

    let listener = await getContract('AvalanchePayoutListener');


    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(ehidna.address);
    values.push(0);
    abis.push(ehidna.interface.encodeFunctionData('upgradeTo', ['0x9E55aA8c57f51655d634C7182a5a44b61Db0eD94']));

    addresses.push(vector.address);
    values.push(0);
    abis.push(vector.interface.encodeFunctionData('upgradeTo', ['0x5EF6c5F6Db0854c34f2E7dee2E4B19F13c94841c']));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('upgradeTo', ['0xde13EbA3109336E43533CbCA0F3817928F40734E']));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('setPayoutListener', [listener.address]));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('setAbroad', [1000100, 1000350]));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

