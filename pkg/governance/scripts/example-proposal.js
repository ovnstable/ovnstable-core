const hre = require("hardhat");


const {getContract, showM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");


async function main() {

    // await test();
    await proposal();

}

async function test(){

    await execTimelock(async (timelock)=>{

        await showM2M();

        let ehidna = await getContract('StrategyEchidnaUsdc');
        let vector= await getContract('StrategyVectorUsdc');

        let exchange = await getContract('Exchange');

        let listener = await getContract('AvalanchePayoutListener');

        await vector.connect(timelock).upgradeTo('0x5EF6c5F6Db0854c34f2E7dee2E4B19F13c94841c');
        await ehidna.connect(timelock).upgradeTo('0x9E55aA8c57f51655d634C7182a5a44b61Db0eD94');

        await showM2M();

        await exchange.connect(timelock).upgradeTo('0xde13EbA3109336E43533CbCA0F3817928F40734E');
        await exchange.connect(timelock).setPayoutListener(listener.address);

        await exchange.connect(timelock).setAbroad(1000100, 1000350);

        await (await exchange.payout()).wait();

        await showM2M();
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

