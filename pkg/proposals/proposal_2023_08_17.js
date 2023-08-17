const { getContract, execTimelock, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testStrategy} = require("@overnight-contracts/common/utils/governance");
const { strategyPikaV4Params } = require("@overnight-contracts/strategies-optimism/deploy/47_strategy_pika_v4");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let StrategyPikaV4 = await getContract('StrategyPikaV4', 'optimism');

    addresses.push(StrategyPikaV4.address);
    values.push(0);
    abis.push(StrategyPikaV4.interface.encodeFunctionData('upgradeTo', ['0xe46C41D78d2115A61b0A898175DC25DB8210B8ec']));

    addresses.push(StrategyPikaV4.address);
    values.push(0);
    abis.push(StrategyPikaV4.interface.encodeFunctionData('setParams', [await strategyPikaV4Params()]));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

