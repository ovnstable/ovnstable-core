const hre = require("hardhat");
const {getContract, showM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {strategySiloUsdc} = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const {ethers} = require("hardhat");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let manager = await getContract('BasePayoutManager', 'base'); 
    const managerAddress = '0x202B006c10Ae9138de78CdD0f9BAbAb559EEC86e'; 
    const timelockAddress = '0x8ab9012d1bff1b62c2ad82ae0106593371e6b247'
 
    addProposalItem(manager, "grantRole", [Roles.DEFAULT_ADMIN_ROLE, timelockAddress]);
    addProposalItem(manager, "upgradeTo", [managerAddress]);

    await testProposal(addresses, values, abis);
    // await createProposal(filename, addresses, values, abis);

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

