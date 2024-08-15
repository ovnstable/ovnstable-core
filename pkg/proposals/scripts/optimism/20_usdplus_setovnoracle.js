const hre = require("hardhat");
const {getContract, showM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

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

    let insurance = await getContract('InsuranceExchange', 'optimism');
    let insuranceToken = await getContract('InsuranceToken', 'optimism');
    let roleManager = await getContract('RoleManager', 'optimism')
    let assetOracle = await getContract('OvnOracleOffChain', 'optimism');

    let asset = OPTIMISM.ovn;
    let odosRouter = OPTIMISM.odosRouterV2;

    let setUpParams = {
        asset: asset,
        rebase: insuranceToken.address,
        odosRouter: odosRouter,
        assetOracle: assetOracle.address,
        roleManager: roleManager.address
    }

    console.log("SetUpParams:", setUpParams);

    addProposalItem(insurance, "setUpParams", [setUpParams]);

    // await testProposal(addresses, values, abis);
    // await testUsdPlus(filename, 'optimism');
    await createProposal(filename, addresses, values, abis);


    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

