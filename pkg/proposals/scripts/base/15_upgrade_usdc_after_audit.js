const hre = require("hardhat");
const {getContract, showM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {strategySiloUsdc} = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const {ethers} = require("hardhat");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];
    
    let usdcPlus = await getContract('UsdPlusToken', 'base_usdc');
    let usdcPlusEx = await getContract('Exchange', 'base_usdc');
    
    let upgradeToToken = '0x8De5410692C0bc722695F17CA4DD55C9506052c6';
    let upgradeToExchange = '0x6e1Bf9Ac635CdE72484A1F51359140F936d0b283';

    addresses.push(usdcPlus.address);
    values.push(0);
    abis.push(usdcPlus.interface.encodeFunctionData('upgradeTo', [upgradeToToken]));

    addresses.push(usdcPlusEx.address);
    values.push(0);
    abis.push(usdcPlusEx.interface.encodeFunctionData('upgradeTo', [upgradeToExchange]));

    // await testProposal(addresses, values, abis);
    // await testUsdPlus(filename, 'base_usdc');
    await createProposal(filename, addresses, values, abis);

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

