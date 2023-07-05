const { getContract, execTimelock } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let StrategyEquilibriaUsdcUsdt = await getContract('StrategyEquilibriaUsdcUsdt', 'arbitrum');
    addresses.push(StrategyEquilibriaUsdcUsdt.address);
    values.push(0);
    abis.push(StrategyEquilibriaUsdcUsdt.interface.encodeFunctionData('upgradeTo', ['0x4571E23A06eBF0Dc3334dc9971fD16306e0eC522']));


    let StrategyPendleUsdcUsdt = await getContract('StrategyPendleUsdcUsdt', 'arbitrum');
    addresses.push(StrategyPendleUsdcUsdt.address);
    values.push(0);
    abis.push(StrategyPendleUsdcUsdt.interface.encodeFunctionData('upgradeTo', ['0xAbCc6b96eCBe649d0c759AF0F1F098B937DE9Eb3']));


    // await createProposal(addresses, values, abis);
    await testProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

