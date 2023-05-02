const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let PortfolioManager = await getContract('PortfolioManager', 'optimism');

    let strategyEtsMuAddress = '0xf71121B4d0692A1F9d90eb1Bc44B4AE917D4f2F1';
    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('removeStrategy', [strategyEtsMuAddress]));

    let strategyEtsPiAddress = '0x33227153345C71DC3552AF7Cba3AF07C7b7B762b';
    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('removeStrategy', [strategyEtsPiAddress]));

    let strategyEtsRhoAddress = '0x832f18e921375d9Dc60ED0239698ccbb0f274248';
    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('removeStrategy', [strategyEtsRhoAddress]));

    let strategyEtsSigmaAddress = '0x9d9DF2740627F422D8b33aFD0CCaeb6407c64aE6';
    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('removeStrategy', [strategyEtsSigmaAddress]));

    let strategyArrakisUsdcDaiAddress = '0x44a07Ee2cD11D16fF65a79132745ebc06180bFeA';
    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('removeStrategy', [strategyArrakisUsdcDaiAddress]));


    let PortfolioManagerDai = await getContract('PortfolioManager', 'optimism_dai');

    let strategyEtsSigmaDaiPlusAddress = '0x4B34af19c2413239B529aeCf420a77c6859Bb0CF';
    addresses.push(PortfolioManagerDai.address);
    values.push(0);
    abis.push(PortfolioManagerDai.interface.encodeFunctionData('removeStrategy', [strategyEtsSigmaDaiPlusAddress]));


    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

