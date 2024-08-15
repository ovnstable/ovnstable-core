const hre = require("hardhat");
const {getContract, showM2M, execTimelock, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {strategySiloUsdc} = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const {ethers} = require("hardhat");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));


async function main() {


    let addresses = [];
    let values = [];
    let abis = [];

    let strategy = await getContract('StrategyPikaV4', 'optimism');
    let pm = await getContract('PortfolioManager', 'optimism');
    let roleManager = await getContract('RoleManager', 'optimism');

    addresses.push(strategy.address);
    values.push(0);
    abis.push(strategy.interface.encodeFunctionData('setStrategyParams', [pm.address, roleManager.address]));

    // await testProposal(addresses, values, abis);
    // await testStrategy(filename,strategy, 'optimism');

    await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

