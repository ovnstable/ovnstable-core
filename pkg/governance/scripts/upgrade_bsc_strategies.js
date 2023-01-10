const {getContract, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, execProposal, testProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let venus = await getContract('StrategyVenusBusd');

    addresses.push(venus.address);
    values.push(0);
    abis.push(venus.interface.encodeFunctionData('upgradeTo', ['0x09E1902AbcfB29f688049EF8D13e1B3Ba2966cba']));

    addresses.push(venus.address);
    values.push(0);
    abis.push(venus.interface.encodeFunctionData('initSlippages', [20, 20]));



    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

