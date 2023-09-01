const { getContract, getPrice, showM2M } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");

async function main() {

    let pm = await getContract('PortfolioManager');

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('addStrategy', ['0x4666Cb455A9a136230244fB9d7df55168e60E22a']));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('addStrategy', ['0xF681af43e1B333D8c26D6cf35c4F6654F894c274']));

    // await showM2M();
    // await testProposal(addresses, values, abis);
    // await showM2M();
    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

