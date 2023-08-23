const { getContract, execTimelock, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testStrategy} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let StrategyMoonwellUsdbc = await getContract('StrategyMoonwellUsdbc', 'base');

    addresses.push(StrategyMoonwellUsdbc.address);
    values.push(0);
    abis.push(StrategyMoonwellUsdbc.interface.encodeFunctionData('upgradeTo', ['']));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

