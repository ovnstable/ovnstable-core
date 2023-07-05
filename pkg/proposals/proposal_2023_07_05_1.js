const { getContract, execTimelock } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let StrategyEquilibriaDaiGDai = await getContract('StrategyEquilibriaDaiGDai', 'arbitrum_dai');
    addresses.push(StrategyEquilibriaDaiGDai.address);
    values.push(0);
    abis.push(StrategyEquilibriaDaiGDai.interface.encodeFunctionData('upgradeTo', ['0x2d631b8fEf93FF36D475b988C7edAF63b850E15d']));

    let StrategyPendleDaiGDai = await getContract('StrategyPendleDaiGDai', 'arbitrum_dai');
    addresses.push(StrategyPendleDaiGDai.address);
    values.push(0);
    abis.push(StrategyPendleDaiGDai.interface.encodeFunctionData('upgradeTo', ['0x0c8492235c2c695Ecb935Ff7da5b3fc30Ac2D3a2']));

    let StrategyPendleDaiUsdt = await getContract('StrategyPendleDaiUsdt', 'arbitrum_dai');
    addresses.push(StrategyPendleDaiUsdt.address);
    values.push(0);
    abis.push(StrategyPendleDaiUsdt.interface.encodeFunctionData('upgradeTo', ['0x3e218CCA1df2C649eee831AE63DB8b6c5d639386']));



    // await createProposal(addresses, values, abis);
    await testProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

