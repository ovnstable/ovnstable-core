const { getContract, execTimelock } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let PortfolioManager = await getContract('PortfolioManager', 'arbitrum');
    let PortfolioManagerDai = await getContract('PortfolioManager', 'arbitrum_dai');

    let StrategySushiswapUsdcUsdt = await getContract('StrategySushiswapUsdcUsdt', 'arbitrum');
    let StrategySushiswapDaiUsdc = await getContract('StrategySushiswapDaiUsdc', 'arbitrum_dai');

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', [StrategySushiswapUsdcUsdt.address]));

    addresses.push(PortfolioManagerDai.address);
    values.push(0);
    abis.push(PortfolioManagerDai.interface.encodeFunctionData('addStrategy', [StrategySushiswapDaiUsdc.address]));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

