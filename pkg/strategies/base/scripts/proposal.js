const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

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
    abis.push(pmUsd.interface.encodeFunctionData('addStrategy', ['']));

    addresses.push(pmDai.address);
    values.push(0);
    abis.push(pmDai.interface.encodeFunctionData('addStrategy', ['0x096d989c4BE45Ff63a9873C1dfDCdcc477c51d6c']));

    addresses.push(pmDai.address);
    values.push(0);
    abis.push(pmDai.interface.encodeFunctionData('addStrategy', ['']));


    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

