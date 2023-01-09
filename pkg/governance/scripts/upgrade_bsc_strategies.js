const {getContract, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, execProposal, testProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let venus = await getContract('StrategyVenusBusd');

    addresses.push(venus.address);
    values.push(0);
    abis.push(venus.interface.encodeFunctionData('upgradeTo', ['0x9572714f7D63aC2F0b91F52c18ABbBC3F2Ff9A53']));

    addresses.push(venus.address);
    values.push(0);
    abis.push(venus.interface.encodeFunctionData('initSlippages', [20, 20]));

    let wombexBusd = await getContract('StrategyWombexBusd');

    addresses.push(wombexBusd.address);
    values.push(0);
    abis.push(wombexBusd.interface.encodeFunctionData('upgradeTo', ['0xbBfDD0663A38FCd35BAa1261dfA4f3BC02E5e26e']));

    addresses.push(wombexBusd.address);
    values.push(0);
    abis.push(wombexBusd.interface.encodeFunctionData('initSlippages', [20, 20]));

    let wombexUsdt = await getContract('StrategyWombexUsdt');

    addresses.push(wombexUsdt.address);
    values.push(0);
    abis.push(wombexUsdt.interface.encodeFunctionData('upgradeTo', ['0x18e4ec90f4715e14372A2d1B116148AFfcf85AC1']));

    addresses.push(wombexUsdt.address);
    values.push(0);
    abis.push(wombexUsdt.interface.encodeFunctionData('initSlippages', [20, 20]));

    let wombexUsdc = await getContract('StrategyWombexUsdc');

    addresses.push(wombexUsdc.address);
    values.push(0);
    abis.push(wombexUsdc.interface.encodeFunctionData('upgradeTo', ['0x5d5696deC88BE163DE85d6Da3a18C3AC175F915E']));

    addresses.push(wombexUsdc.address);
    values.push(0);
    abis.push(wombexUsdc.interface.encodeFunctionData('initSlippages', [20, 20]));


    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

