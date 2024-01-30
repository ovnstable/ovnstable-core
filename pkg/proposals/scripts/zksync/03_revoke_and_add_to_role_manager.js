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

    let roleManager = await getContract('RoleManager', 'zksync');
    let yaroslav = "0x0bE3f37201699F00C21dCba18861ed4F60288E1D";
    let nikita = "0xC33d762fC981c0c1012Ed1668f1A993fC62f9C66";
    let devOld = "0x66B439c0a695cc3Ed3d9f50aA4E6D2D917659FfD";
    let dev3rd = "0x05129E3CE8C566dE564203B0fd85111bBD84C424";

    addresses.push(roleManager.address);
    values.push(0);
    abis.push(roleManager.interface.encodeFunctionData('revokeRole', [Roles.PORTFOLIO_AGENT_ROLE, yaroslav]));

    // addresses.push(roleManager.address);
    // values.push(0);
    // abis.push(roleManager.interface.encodeFunctionData('revokeRole', [Roles.UNIT_ROLE, devOld]));

    addresses.push(roleManager.address);
    values.push(0);
    abis.push(roleManager.interface.encodeFunctionData('revokeRole', [Roles.PORTFOLIO_AGENT_ROLE, devOld]));

    addresses.push(roleManager.address);
    values.push(0);
    abis.push(roleManager.interface.encodeFunctionData('grantRole', [Roles.PORTFOLIO_AGENT_ROLE, dev3rd]));

    // addresses.push(roleManager.address);
    // values.push(0);
    // abis.push(roleManager.interface.encodeFunctionData('grantRole', [Roles.UNIT_ROLE, dev3rd]));

    addresses.push(roleManager.address);
    values.push(0);
    abis.push(roleManager.interface.encodeFunctionData('grantRole', [Roles.PORTFOLIO_AGENT_ROLE, nikita]));

    // await testProposal(addresses, values, abis);
    await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

