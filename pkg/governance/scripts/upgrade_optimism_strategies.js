const {getContract, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, execProposal, testProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let StrategyAave = await getContract('StrategyAave');

    addresses.push(StrategyAave.address);
    values.push(0);
    abis.push(StrategyAave.interface.encodeFunctionData('upgradeTo', ['0x6d2eaEc2f07358E50133002B112e9e9Ca5C8314f']));

    addresses.push(StrategyAave.address);
    values.push(0);
    abis.push(StrategyAave.interface.encodeFunctionData('initSlippages', [20, 20]));

    let StrategyBeethovenxSonne = await getContract('StrategyBeethovenxSonne');

    addresses.push(StrategyBeethovenxSonne.address);
    values.push(0);
    abis.push(StrategyBeethovenxSonne.interface.encodeFunctionData('upgradeTo', ['0xBf21CbE292b40347b3691C3187645501fc0E5F97']));

    addresses.push(StrategyBeethovenxSonne.address);
    values.push(0);
    abis.push(StrategyBeethovenxSonne.interface.encodeFunctionData('initSlippages', [20, 20]));

    let StrategyBeethovenxUsdc = await getContract('StrategyBeethovenxUsdc');

    addresses.push(StrategyBeethovenxUsdc.address);
    values.push(0);
    abis.push(StrategyBeethovenxUsdc.interface.encodeFunctionData('upgradeTo', ['0xaa6cFd8a0ba4fA23f1a24a6Ac72717ba977fa739']));

    addresses.push(StrategyBeethovenxUsdc.address);
    values.push(0);
    abis.push(StrategyBeethovenxUsdc.interface.encodeFunctionData('initSlippages', [20, 20]));

    let StrategyEtsAlphaPlus = await getContract('StrategyEtsAlphaPlus');

    addresses.push(StrategyEtsAlphaPlus.address);
    values.push(0);
    abis.push(StrategyEtsAlphaPlus.interface.encodeFunctionData('upgradeTo', ['0x6B3CABb57C12De771022669EF40294d39B4445BB']));

    addresses.push(StrategyEtsAlphaPlus.address);
    values.push(0);
    abis.push(StrategyEtsAlphaPlus.interface.encodeFunctionData('initSlippages', [20, 20]));

    let StrategyEtsBetaPlus = await getContract('StrategyEtsBetaPlus');

    addresses.push(StrategyEtsBetaPlus.address);
    values.push(0);
    abis.push(StrategyEtsBetaPlus.interface.encodeFunctionData('upgradeTo', ['0x028aDfC6E1a569720DCfFc6e36FFc4278627E740']));

    addresses.push(StrategyEtsBetaPlus.address);
    values.push(0);
    abis.push(StrategyEtsBetaPlus.interface.encodeFunctionData('initSlippages', [20, 20]));

    let StrategyReaperSonneDai = await getContract('StrategyReaperSonneDai');

    addresses.push(StrategyReaperSonneDai.address);
    values.push(0);
    abis.push(StrategyReaperSonneDai.interface.encodeFunctionData('upgradeTo', ['0xa45df21A497e3e31A7E0fbDE52C10d8158cb13E8']));

    addresses.push(StrategyReaperSonneDai.address);
    values.push(0);
    abis.push(StrategyReaperSonneDai.interface.encodeFunctionData('initSlippages', [20, 20]));

    let StrategyReaperSonneUsdc = await getContract('StrategyReaperSonneUsdc');

    addresses.push(StrategyReaperSonneUsdc.address);
    values.push(0);
    abis.push(StrategyReaperSonneUsdc.interface.encodeFunctionData('upgradeTo', ['0x544c09424Dfc2865c05DeDcaDf5801E09a1F8dCC']));

    addresses.push(StrategyReaperSonneUsdc.address);
    values.push(0);
    abis.push(StrategyReaperSonneUsdc.interface.encodeFunctionData('initSlippages', [20, 20]));

    let StrategyReaperSonneUsdt = await getContract('StrategyReaperSonneUsdt');

    addresses.push(StrategyReaperSonneUsdt.address);
    values.push(0);
    abis.push(StrategyReaperSonneUsdt.interface.encodeFunctionData('upgradeTo', ['0x8D2126e13D4FB57B4DD1E37CB0E74ac270528298']));

    addresses.push(StrategyReaperSonneUsdt.address);
    values.push(0);
    abis.push(StrategyReaperSonneUsdt.interface.encodeFunctionData('initSlippages', [20, 20]));

    let StrategyRubiconDai = await getContract('StrategyRubiconDai');

    addresses.push(StrategyRubiconDai.address);
    values.push(0);
    abis.push(StrategyRubiconDai.interface.encodeFunctionData('upgradeTo', ['0x695368A1A3b2AcC6b9AC3C84ef8881CaB6b5A58d']));

    addresses.push(StrategyRubiconDai.address);
    values.push(0);
    abis.push(StrategyRubiconDai.interface.encodeFunctionData('initSlippages', [20, 20]));

    let StrategyRubiconUsdc = await getContract('StrategyRubiconUsdc');

    addresses.push(StrategyRubiconUsdc.address);
    values.push(0);
    abis.push(StrategyRubiconUsdc.interface.encodeFunctionData('upgradeTo', ['0xFAE5EBFC4a97b17a16c6666966aD2A27b4037211']));

    addresses.push(StrategyRubiconUsdc.address);
    values.push(0);
    abis.push(StrategyRubiconUsdc.interface.encodeFunctionData('initSlippages', [20, 20]));

    let StrategyRubiconUsdt = await getContract('StrategyRubiconUsdt');

    addresses.push(StrategyRubiconUsdt.address);
    values.push(0);
    abis.push(StrategyRubiconUsdt.interface.encodeFunctionData('upgradeTo', ['0xd48f25EC821b3ae3E11b53fE1795Abdd2E2d1578']));

    addresses.push(StrategyRubiconUsdt.address);
    values.push(0);
    abis.push(StrategyRubiconUsdt.interface.encodeFunctionData('initSlippages', [20, 20]));


    await showM2M();
    await testProposal(addresses, values, abis);
    await showM2M();

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

