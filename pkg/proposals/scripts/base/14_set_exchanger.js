const hre = require("hardhat");
const {getContract, showM2M, execTimelock, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {strategySiloUsdc} = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const {ethers} = require("hardhat");
const {BASE} = require("@overnight-contracts/common/utils/assets");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let epsilon = await getContract('StrategyEtsEpsilon', 'base');

    let epsilonParams =  {
        asset: BASE.usdbc,
        rebaseToken: '0xa42DFcE3518B730624F055AF8A95222F02CF5AFA',
        hedgeExchanger: '0x33c1327834BcedD2206335ED62E09ce65617d346',
    }

    addresses.push(epsilon.address);
    values.push(0);
    abis.push(epsilon.interface.encodeFunctionData('setParams', [epsilonParams]));
  
    //
    // await showM2M();
    // await testProposal(addresses, values, abis);
    // await showM2M();
    //
    // await testStrategy(filename, epsilon, 'base');
    // await testUsdbPlus(filename, 'base');
    //
    await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

