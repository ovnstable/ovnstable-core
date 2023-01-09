const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, execProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let StrategyAave = await getContract('StrategyAave');

    addresses.push(StrategyAave.address);
    values.push(0);
    abis.push(StrategyAave.interface.encodeFunctionData('upgradeTo', ['0xb6F6e7A859BdadD9bC403c8950110662634B1Ff2']));

    addresses.push(StrategyAave.address);
    values.push(0);
    abis.push(StrategyAave.interface.encodeFunctionData('initSlippages', [20, 20]));

    let StrategyBalancerUsdc = await getContract('StrategyBalancerUsdc');

    addresses.push(StrategyBalancerUsdc.address);
    values.push(0);
    abis.push(StrategyBalancerUsdc.interface.encodeFunctionData('upgradeTo', ['0xd48F0a7976df6111db7CCeb8E65a92435e2fBa3e']));

    addresses.push(StrategyBalancerUsdc.address);
    values.push(0);
    abis.push(StrategyBalancerUsdc.interface.encodeFunctionData('initSlippages', [20, 20]));

    let StrategyEtsAlfaPlus = await getContract('StrategyEtsAlfaPlus');

    addresses.push(StrategyEtsAlfaPlus.address);
    values.push(0);
    abis.push(StrategyEtsAlfaPlus.interface.encodeFunctionData('upgradeTo', ['0xa96780ED172B5275D814E31524E27FD2FB962bB0']));

    addresses.push(StrategyEtsAlfaPlus.address);
    values.push(0);
    abis.push(StrategyEtsAlfaPlus.interface.encodeFunctionData('initSlippages', [20, 20]));

    let StrategyEtsEpsilonPlus = await getContract('StrategyEtsEpsilonPlus');

    addresses.push(StrategyEtsEpsilonPlus.address);
    values.push(0);
    abis.push(StrategyEtsEpsilonPlus.interface.encodeFunctionData('upgradeTo', ['0x3Efe5589acd0f5a557449359E0461883B79e08e7']));

    addresses.push(StrategyEtsEpsilonPlus.address);
    values.push(0);
    abis.push(StrategyEtsEpsilonPlus.interface.encodeFunctionData('initSlippages', [20, 20]));

    let StrategyEtsGammaPlus = await getContract('StrategyEtsGammaPlus');

    addresses.push(StrategyEtsGammaPlus.address);
    values.push(0);
    abis.push(StrategyEtsGammaPlus.interface.encodeFunctionData('upgradeTo', ['0xa96780ED172B5275D814E31524E27FD2FB962bB0']));

    addresses.push(StrategyEtsGammaPlus.address);
    values.push(0);
    abis.push(StrategyEtsGammaPlus.interface.encodeFunctionData('initSlippages', [20, 20]));

    let StrategyEtsZetaPlus = await getContract('StrategyEtsZetaPlus');

    addresses.push(StrategyEtsZetaPlus.address);
    values.push(0);
    abis.push(StrategyEtsZetaPlus.interface.encodeFunctionData('upgradeTo', ['0xa96780ED172B5275D814E31524E27FD2FB962bB0']));

    addresses.push(StrategyEtsZetaPlus.address);
    values.push(0);
    abis.push(StrategyEtsZetaPlus.interface.encodeFunctionData('initSlippages', [20, 20]));

    let StrategyUniV3DaiUsdt = await getContract('StrategyUniV3DaiUsdt');

    addresses.push(StrategyUniV3DaiUsdt.address);
    values.push(0);
    abis.push(StrategyUniV3DaiUsdt.interface.encodeFunctionData('upgradeTo', ['0x276CBb2612EA6e5B5F1ba5C339B1499082493467']));

    addresses.push(StrategyUniV3DaiUsdt.address);
    values.push(0);
    abis.push(StrategyUniV3DaiUsdt.interface.encodeFunctionData('initSlippages', [20, 20]));


    await createProposal(addresses, values, abis)

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

