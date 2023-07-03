const { getContract, execTimelock } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let StrategyAuraUsdcUsdtDai = await getContract('StrategyAuraUsdcUsdtDai', 'arbitrum');
    addresses.push(StrategyAuraUsdcUsdtDai.address);
    values.push(0);
    abis.push(StrategyAuraUsdcUsdtDai.interface.encodeFunctionData('upgradeTo', ['0x690cAf7e6D87f0Af2F25AAD8Df1A4F1687C9597f']));

    let StrategyAuraDaiUsdcUsdt = await getContract('StrategyAuraDaiUsdcUsdt', 'arbitrum_dai');
    addresses.push(StrategyAuraDaiUsdcUsdt.address);
    values.push(0);
    abis.push(StrategyAuraDaiUsdcUsdt.interface.encodeFunctionData('upgradeTo', ['0xa699bBc50c64DC215e5D8550799b5A0eCEbc4D5f']));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

