const hre = require("hardhat");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'bsc');
    let StrategyRadpieUsdc = await getContract('StrategyRadpieUsdc', 'bsc');

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('addStrategy', [StrategyRadpieUsdc.address]));

    let pmUsdt = await getContract('PortfolioManager', 'bsc_usdt');
    let StrategyRadpieUsdt = await getContract('StrategyRadpieUsdt', 'bsc_usdt');

    addresses.push(pmUsdt.address);
    values.push(0);
    abis.push(pmUsdt.interface.encodeFunctionData('addStrategy', [StrategyRadpieUsdt.address]));

    await testProposal(addresses, values, abis);
    await testUsdPlus(filename, 'bsc');
    await testUsdPlus(filename, 'bsc_usdt');
//    await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

