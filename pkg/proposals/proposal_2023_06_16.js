const { getContract, execTimelock } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let Exchange = await getContract('Exchange', 'polygon');
    let PolygonPayoutListener = await getContract('PolygonPayoutListener', 'polygon');

    addresses.push(Exchange.address);
    values.push(0);
    abis.push(Exchange.interface.encodeFunctionData('upgradeTo', ['']));

    addresses.push(Exchange.address);
    values.push(0);
    abis.push(Exchange.interface.encodeFunctionData('setPayoutListener', [PolygonPayoutListener.address]));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

