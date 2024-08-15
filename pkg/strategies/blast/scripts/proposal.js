const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let pmUsd = await getContract('PortfolioManager', 'base');
    let pmDai = await getContract('PortfolioManager', 'base_dai');

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(pmUsd.address);
    values.push(0);
    abis.push(pmUsd.interface.encodeFunctionData('addStrategy', ['0xc1AaDA2FeEcb5086dB98bbedf01ac93292Df17EA']));

    addresses.push(pmUsd.address);
    values.push(0);
    abis.push(pmUsd.interface.encodeFunctionData('addStrategy', ['0xf0b8121E1871712aaD5173525492c016Ca67FFD5']));

    addresses.push(pmDai.address);
    values.push(0);
    abis.push(pmDai.interface.encodeFunctionData('addStrategy', ['0x096d989c4BE45Ff63a9873C1dfDCdcc477c51d6c']));

    addresses.push(pmDai.address);
    values.push(0);
    abis.push(pmDai.interface.encodeFunctionData('addStrategy', ['0xb4493a7C35645Ef5c677688F92125ED6cedAB9E7']));


    // await testProposal(addresses, values, abis);
    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

