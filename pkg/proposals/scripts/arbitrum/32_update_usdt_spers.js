const hre = require("hardhat");
const { getContract, showM2M, execTimelock } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const { prepareEnvironment } = require("@overnight-contracts/common/utils/tests");
const { strategySiloUsdc } = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const { ethers } = require("hardhat");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    const { deployer } = await getNamedAccounts();

    let strategyEpsilon = await getContract('StrategySperEpsilon', 'arbitrum_usdt');
    let strategyZeta = await getContract('StrategySperZeta', 'arbitrum_usdt');

    let pm = await getContract('PortfolioManager', 'arbitrum_usdt');
    let roleManager = await getContract('RoleManager', 'arbitrum_usdt');

    addresses.push(strategyEpsilon.address);
    values.push(0);
    abis.push(strategyEpsilon.interface.encodeFunctionData('setStrategyParams', [pm.address, roleManager.address]))

    addresses.push(strategyZeta.address);
    values.push(0);
    abis.push(strategyZeta.interface.encodeFunctionData('setStrategyParams', [pm.address, roleManager.address]))

    await testProposal(addresses, values, abis);
    await testStrategy(filename, strategyEpsilon, "arbitrum_usdt")
    await testStrategy(filename, strategyZeta, "arbitrum_usdt")
    // await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

