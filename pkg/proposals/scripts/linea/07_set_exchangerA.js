const hre = require("hardhat");
const {getContract, showM2M, execTimelock, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {strategySiloUsdc} = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const {ethers} = require("hardhat");
const {LINEA} = require("@overnight-contracts/common/utils/assets");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let strategy = await getContract('strategylphaLinea', 'linea');

    let strategyParams =  {
        asset: LINEA.usdc,
        rebaseToken: '0xC98C43CADfC611eABC08940a86B910C6433FA12A',
        hedgeExchanger: '0x631e1a02B52e48311c7FC91F55FfB15c26b50503',
    }

    addresses.push(strategy.address);
    values.push(0);
    abis.push(strategy.interface.encodeFunctionData('setParams', [strategyParams]));

    
  
    //
    // await showM2M();
    // await testProposal(addresses, values, abis);
    // await showM2M();
    //
    await testStrategy(filename, strategy, 'linea'); 
    // await testUsdPlus(filename, 'linea');
    // await createProposal(filename, addresses, values, abis); 
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

