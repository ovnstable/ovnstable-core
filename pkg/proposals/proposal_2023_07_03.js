const { getContract, execTimelock } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let StrategyAuraUsdcUsdtDai = await getContract('StrategyAuraUsdcUsdtDai', 'arbitrum');
    addresses.push(StrategyAuraUsdcUsdtDai.address);
    values.push(0);
    abis.push(StrategyAuraUsdcUsdtDai.interface.encodeFunctionData('upgradeTo', ['']));

    let StrategyAuraDaiUsdcUsdt = await getContract('StrategyAuraDaiUsdcUsdt', 'arbitrum_dai');
    addresses.push(StrategyAuraDaiUsdcUsdt.address);
    values.push(0);
    abis.push(StrategyAuraDaiUsdcUsdt.interface.encodeFunctionData('upgradeTo', ['']));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

