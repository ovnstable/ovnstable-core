const hre = require("hardhat");
const {getContract, showM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'arbitrum_eth');
    let roleManager = await getContract('RoleManager', 'arbitrum');
    let pendle = await getContract('StrategyPendleWethWstEth', 'arbitrum_eth');

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('addStrategy', ['0x6787A015c8224e864F456Fe18aca57f0AE1BabB6'])); // Silo ETH

    addresses.push(pendle.address);
    values.push(0);
    abis.push(pendle.interface.encodeFunctionData('upgradeTo', ['0xeeEac008cDEEa77cbCBcFA7D6B30b33E1E9356a9']));

    addresses.push(pendle.address);
    values.push(0);
    abis.push(pendle.interface.encodeFunctionData('setStrategyParams', [pm.address, roleManager.address]));

    addresses.push(pendle.address); // Pendle
    values.push(0);
    abis.push(pendle.interface.encodeFunctionData('grantRole', [Roles.DEFAULT_ADMIN_ROLE, '0x66B439c0a695cc3Ed3d9f50aA4E6D2D917659FfD']));

    addresses.push('0xBf49142B268d505D32464358Fe85f888E95709b8'); // StrategyEtsOmegaArb
    values.push(0);
    abis.push(pendle.interface.encodeFunctionData('grantRole', [Roles.DEFAULT_ADMIN_ROLE, '0x66B439c0a695cc3Ed3d9f50aA4E6D2D917659FfD']));

    addresses.push('0x22A2BF6BCC902453D894Fe0C9B3cAd29B0702446'); // StrategyOmegaArb
    values.push(0);
    abis.push(pendle.interface.encodeFunctionData('grantRole', [Roles.DEFAULT_ADMIN_ROLE, '0x66B439c0a695cc3Ed3d9f50aA4E6D2D917659FfD']));

    // await testProposal(addresses, values, abis);
    await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

