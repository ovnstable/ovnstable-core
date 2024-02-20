const hre = require("hardhat");
const {getContract, showM2M, execTimelock, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {strategyASiloUsdc} = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategyA_silo_usdc");
const {ethers} = require("hardhat");
const {LINEA} = require("@overnight-contracts/common/utils/assets");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let strategyA = await getContract('StrategyAlphaLinea', 'linea');

    let strategyAParams =  {
        asset: LINEA.usdc,
        rebaseToken: '0xC98C43CADfC611eABC08940a86B910C6433FA12A',
        hedgeExchanger: '0x631e1a02B52e48311c7FC91F55FfB15c26b50503',
    }

    addresses.push(strategyA.address);
    values.push(0);
    abis.push(strategyA.interface.encodeFunctionData('setParams', [strategyAParams]));


    let strategyB = await getContract('StrategyBBetaLinea', 'linea');

    let strategyBParams =  {
        asset: LINEA.usdt,
        rebaseToken: '0x2253BdD62eA63F7CBbf92785EEdcCAc7521FB6A1',
        hedgeExchanger: '0x40ae104C59af1B9d23Dcd9c5715780E2132631f1',
    }

    addresses.push(strategyB.address);
    values.push(0);
    abis.push(strategyB.interface.encodeFunctionData('setParams', [strategyBParams]));
    
  
    //
    // await showM2M();
    // await testProposal(addresses, values, abis);
    // await showM2M();
    //
    await testStrategy(filename, strategyA, 'linea'); 
    await testStrategy(filename, strategyB, 'linea'); 
    //  await testUsdPlus(filename, 'linea');
    //  await testUsdPlus(filename, 'linea_usdt');
    // await createProposal(filename, addresses, values, abis); 
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

