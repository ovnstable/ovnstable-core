const {getContract, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, execProposal, testProposal, testUsdPlus} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let sonneDai = await getContract('StrategyReaperSonneDai');

    addresses.push(sonneDai.address);
    values.push(0);
    abis.push(sonneDai.interface.encodeFunctionData('upgradeTo', ['0x7f4f84c02E63A83E52e48B60eec33C1Fe6700E57']));

    addresses.push(sonneDai.address);
    values.push(0);
    abis.push(sonneDai.interface.encodeFunctionData('initSlippages', [20, 20]));


    let sonneUsdc = await getContract('StrategyReaperSonneUsdc');

    addresses.push(sonneUsdc.address);
    values.push(0);
    abis.push(sonneUsdc.interface.encodeFunctionData('upgradeTo', ['0x4aA2172b7c6359e0f5050b16e0Fc815419220cf4']));

    addresses.push(sonneUsdc.address);
    values.push(0);
    abis.push(sonneUsdc.interface.encodeFunctionData('initSlippages', [20, 20]));

    let sonneUsdt = await getContract('StrategyReaperSonneUsdt');

    addresses.push(sonneUsdt.address);
    values.push(0);
    abis.push(sonneUsdt.interface.encodeFunctionData('upgradeTo', ['0xc3e0d1ADEaabe5Df13C2F7768af485F14C66e87C']));

    addresses.push(sonneUsdt.address);
    values.push(0);
    abis.push(sonneUsdt.interface.encodeFunctionData('initSlippages', [20, 20]));

    let rubiconDai = await getContract('StrategyRubiconDai');

    addresses.push(rubiconDai.address);
    values.push(0);
    abis.push(rubiconDai.interface.encodeFunctionData('upgradeTo', ['0xD9f5ffE0C1625FD973968457f1E192cB48DEC832']));

    addresses.push(rubiconDai.address);
    values.push(0);
    abis.push(rubiconDai.interface.encodeFunctionData('initSlippages', [20, 20]));

    let rubiconUsdc = await getContract('StrategyRubiconUsdc');

    addresses.push(rubiconUsdc.address);
    values.push(0);
    abis.push(rubiconUsdc.interface.encodeFunctionData('upgradeTo', ['0x3ddd035b53035E5E72b5e3d36685f4E28893e09d']));

    addresses.push(rubiconUsdc.address);
    values.push(0);
    abis.push(rubiconUsdc.interface.encodeFunctionData('initSlippages', [20, 20]));

    let rubiconUsdt = await getContract('StrategyRubiconUsdt');

    addresses.push(rubiconUsdt.address);
    values.push(0);
    abis.push(rubiconUsdt.interface.encodeFunctionData('upgradeTo', ['0x680fc24418B905a7450d720121aA621FE2B20bC4']));

    addresses.push(rubiconUsdt.address);
    values.push(0);
    abis.push(rubiconUsdt.interface.encodeFunctionData('initSlippages', [20, 20]));

    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

