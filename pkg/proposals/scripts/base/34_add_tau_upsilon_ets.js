const hre = require("hardhat");
const { getContract, showM2M, execTimelock } = require("@overnight-contracts/common/utils/script-utils");
const {
    createProposal,
    testProposal,
    testUsdPlus,
    testStrategy
} = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const { prepareEnvironment } = require("@overnight-contracts/common/utils/tests");
const { strategySiloUsdc } = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const { ethers } = require("hardhat");
const { strategyEtsEtaParams } = require("@overnight-contracts/strategies-base/deploy/11_ets_eta");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let strategy_tau = await getContract('StrategyEtsTau', 'base');
    let strategy_upsilon = await getContract('StrategyEtsUpsilon', 'base');
    let pm = await getContract('PortfolioManager', 'base');

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('addStrategy', [strategy_tau.address]));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('addStrategy', [strategy_upsilon.address]));

    // await testProposal(addresses, values, abis);
    // await testUsdPlus(filename, 'base');

    await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

