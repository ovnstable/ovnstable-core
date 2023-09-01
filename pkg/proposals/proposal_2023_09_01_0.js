const { getContract, execTimelock, showM2M } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let PortfolioManager = await getContract('PortfolioManager', 'base');
    let StrategySonneUsdbc = await getContract('StrategySonneUsdbc', 'base');

    let PortfolioManagerDai = await getContract('PortfolioManager', 'base_dai');
    let StrategySonneDai = await getContract('StrategySonneDai', 'base_dai');

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', [StrategySonneUsdbc.address]));

    addresses.push(PortfolioManagerDai.address);
    values.push(0);
    abis.push(PortfolioManagerDai.interface.encodeFunctionData('addStrategy', [StrategySonneDai.address]));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

