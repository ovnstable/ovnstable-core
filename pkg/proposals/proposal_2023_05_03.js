const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let PortfolioManager = await getContract('PortfolioManager', 'optimism');

    let arrakisUsdcUsdt = '0xad0456098e5F5f3AC758331e13eA661ceA7FD02F';
    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', [arrakisUsdcUsdt]));


    let PortfolioManagerDai = await getContract('PortfolioManager', 'optimism_dai');

    let arrakisDaiUsdc = '0x5518eD1DD612742e3369336ecC0fb22d94942725';
    addresses.push(PortfolioManagerDai.address);
    values.push(0);
    abis.push(PortfolioManagerDai.interface.encodeFunctionData('addStrategy', [arrakisDaiUsdc]));


    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

