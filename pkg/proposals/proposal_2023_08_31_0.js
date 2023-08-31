const { getContract, execTimelock, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testStrategy} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let StrategyMoonwellUsdbc = await getContract('StrategyMoonwellUsdbc', 'base');
    let StrategyMoonwellDai = await getContract('StrategyMoonwellDai', 'base_dai');

    addresses.push(StrategyMoonwellUsdbc.address);
    values.push(0);
    abis.push(StrategyMoonwellUsdbc.interface.encodeFunctionData('upgradeTo', ['0x530b1BaFbd9185717e7dCB8ea21419A98E7e155b']));

    addresses.push(StrategyMoonwellDai.address);
    values.push(0);
    abis.push(StrategyMoonwellDai.interface.encodeFunctionData('upgradeTo', ['0xD60CAEB098Ee516fe6afCfC28247c50E991E47d1']));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

