const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let timelock = await getContract('OvnTimelockController');

    let addresses = [];
    let values = [];
    let abis = [];


    addresses.push(timelock.address);
    values.push(0);
    abis.push(timelock.interface.encodeFunctionData('updateDelay', [21600])); // 6 hours

    await createProposal(addresses, values, abis);
}




main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

