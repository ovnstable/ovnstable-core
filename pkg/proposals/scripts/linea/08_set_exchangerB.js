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
 
    let strategy = await getContract('strategyBetaLinea', 'linea');

    let strategyParams =  {
        asset: LINEA.usdt,
        rebaseToken: '0x2253BdD62eA63F7CBbf92785EEdcCAc7521FB6A1',
        hedgeExchanger: '0x40ae104C59af1B9d23Dcd9c5715780E2132631f1',
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

