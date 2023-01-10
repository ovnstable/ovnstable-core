const {getContract, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, execProposal, testProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let StrategyAave = await getContract('StrategyAave');

    addresses.push(StrategyAave.address);
    values.push(0);
    abis.push(StrategyAave.interface.encodeFunctionData('upgradeTo', ['0xbb1a9c7b5F9ecAa5DBe0A8C21fFd08DcED1D3A43']));

    addresses.push(StrategyAave.address);
    values.push(0);
    abis.push(StrategyAave.interface.encodeFunctionData('initSlippages', [20, 20]));

    let gamma = await getContract('StrategyEtsGammaPlus');

    addresses.push(gamma.address);
    values.push(0);
    abis.push(gamma.interface.encodeFunctionData('upgradeTo', ['0x99da9476cAD88D03ae4632B090425a234ca07CE6']));

    addresses.push(gamma.address);
    values.push(0);
    abis.push(gamma.interface.encodeFunctionData('initSlippages', [20, 20]));

    let alfa = await getContract('StrategyEtsAlfaPlus');

    addresses.push(alfa.address);
    values.push(0);
    abis.push(alfa.interface.encodeFunctionData('upgradeTo', ['0x99da9476cAD88D03ae4632B090425a234ca07CE6']));

    addresses.push(alfa.address);
    values.push(0);
    abis.push(alfa.interface.encodeFunctionData('initSlippages', [20, 20]));

    let zeta = await getContract('StrategyEtsZetaPlus');

    addresses.push(zeta.address);
    values.push(0);
    abis.push(zeta.interface.encodeFunctionData('upgradeTo', ['0x99da9476cAD88D03ae4632B090425a234ca07CE6']));

    addresses.push(zeta.address);
    values.push(0);
    abis.push(zeta.interface.encodeFunctionData('initSlippages', [20, 20]));


    let pm = await getContract('PortfolioManager');

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('removeStrategy', ['0x0dD66c4f9a739042d313d2db48Bb62aadBcFEdc2']));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('removeStrategy', ['0x3114bfDce69a13d2258BD273D231386A074cEC48']));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('removeStrategy', ['0x0B5b9451b3b8C2Ba4e5CDF0ac6d9D05EE3ba9d30']));

    // await showM2M();
    // await testProposal(addresses, values, abis);
    // await showM2M();
    await createProposal(addresses, values, abis)

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

