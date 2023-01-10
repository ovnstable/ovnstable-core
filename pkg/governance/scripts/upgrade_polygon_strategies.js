const {getContract, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, execProposal, testProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let StrategyAave = await getContract('StrategyAave');

    addresses.push(StrategyAave.address);
    values.push(0);
    abis.push(StrategyAave.interface.encodeFunctionData('grantRole', ['0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3','0xa8b1981bee803c5de8c714fd0dae7a054b114653']));

    addresses.push(StrategyAave.address);
    values.push(0);
    abis.push(StrategyAave.interface.encodeFunctionData('upgradeTo', ['0xbb1a9c7b5F9ecAa5DBe0A8C21fFd08DcED1D3A43']));

    addresses.push(StrategyAave.address);
    values.push(0);
    abis.push(StrategyAave.interface.encodeFunctionData('initSlippages', [20, 20]));

    let gamma = await getContract('StrategyEtsGammaPlus');

    addresses.push(gamma.address);
    values.push(0);
    abis.push(gamma.interface.encodeFunctionData('grantRole', ['0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3','0xa8b1981bee803c5de8c714fd0dae7a054b114653']));

    addresses.push(gamma.address);
    values.push(0);
    abis.push(gamma.interface.encodeFunctionData('upgradeTo', ['0x99da9476cAD88D03ae4632B090425a234ca07CE6']));

    addresses.push(gamma.address);
    values.push(0);
    abis.push(gamma.interface.encodeFunctionData('initSlippages', [20, 20]));

    let alfa = await getContract('StrategyEtsAlfaPlus');

    addresses.push(alfa.address);
    values.push(0);
    abis.push(alfa.interface.encodeFunctionData('grantRole', ['0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3','0xa8b1981bee803c5de8c714fd0dae7a054b114653']));

    addresses.push(alfa.address);
    values.push(0);
    abis.push(alfa.interface.encodeFunctionData('upgradeTo', ['0x99da9476cAD88D03ae4632B090425a234ca07CE6']));

    addresses.push(alfa.address);
    values.push(0);
    abis.push(alfa.interface.encodeFunctionData('initSlippages', [20, 20]));


    let pm = await getContract('PortfolioManager');

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('addStrategy', ['0xA0C1694179695B50b18b4C25373143a334FaFbed']));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('addStrategy', ['0x85542c788BA3288f3b5873C83Ca5d72D97d25D00']));

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

