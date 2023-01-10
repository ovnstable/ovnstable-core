const {getContract, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, execProposal, testProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let StrategyAave = await getContract('StrategyAave');

    addresses.push(StrategyAave.address);
    values.push(0);
    abis.push(StrategyAave.interface.encodeFunctionData('upgradeTo', ['0xc69F69C6165314B9D658E5345DaDea7956145F02']));

    addresses.push(StrategyAave.address);
    values.push(0);
    abis.push(StrategyAave.interface.encodeFunctionData('initSlippages', [20, 20]));


    let StrategyEtsAlphaPlus = await getContract('StrategyEtsAlphaPlus');

    addresses.push(StrategyEtsAlphaPlus.address);
    values.push(0);
    abis.push(StrategyEtsAlphaPlus.interface.encodeFunctionData('upgradeTo', ['0x58E1c54820048ACBa5F83515f6Bce8468ab5a2F0']));

    addresses.push(StrategyEtsAlphaPlus.address);
    values.push(0);
    abis.push(StrategyEtsAlphaPlus.interface.encodeFunctionData('initSlippages', [20, 20]));

    let StrategyEtsBetaPlus = await getContract('StrategyEtsBetaPlus');

    addresses.push(StrategyEtsBetaPlus.address);
    values.push(0);
    abis.push(StrategyEtsBetaPlus.interface.encodeFunctionData('upgradeTo', ['0x4e55B26F3be9e954AB26ca0fc28cCE8498310cB9']));

    addresses.push(StrategyEtsBetaPlus.address);
    values.push(0);
    abis.push(StrategyEtsBetaPlus.interface.encodeFunctionData('initSlippages', [20, 20]));

    let pm = await getContract('PortfolioManager');

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('removeStrategy', ['0x1B797450434e0DEdA4D2c3198eEe1d677d3dCe4C']));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('removeStrategy', ['0xBED45d30B6A20d77621965E42C855E1060b4A7AF']));

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

