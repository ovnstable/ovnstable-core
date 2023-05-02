const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let PortfolioManager = await getContract('PortfolioManager', 'optimism');

    let strategyEtsGammaAddress = '0x0f6C2C868b94Ca6f00F77674009b34E0C9e67dB8';
    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', [strategyEtsGammaAddress]));

    let strategyEtsDeltaAddress = '0x420B3Da53Ff4C66d818aF07Fac867CD5b0d2cF33';
    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', [strategyEtsDeltaAddress]));


    let PortfolioManagerDai = await getContract('PortfolioManager', 'optimism_dai');

    let strategyEtsEtaDaiAddress = '0xDD2E9873e4c1402FD81c62b69aaCD4a28112Ed5a';
    addresses.push(PortfolioManagerDai.address);
    values.push(0);
    abis.push(PortfolioManagerDai.interface.encodeFunctionData('addStrategy', [strategyEtsEtaDaiAddress]));


    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

