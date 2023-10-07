const hre = require("hardhat");
const { getContract } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const {Wallets} = require("@overnight-contracts/common/utils/wallets");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let StrategyEtsOmicron = await getContract('StrategyEtsOmicron', 'base');
    let StrategyEtsXi = await getContract('StrategyEtsXi', 'base');

    addresses.push(StrategyEtsOmicron.address);
    values.push(0);
    abis.push(StrategyEtsOmicron.interface.encodeFunctionData('grantRole', [Roles.DEFAULT_ADMIN_ROLE, Wallets.DEV]));

    addresses.push(StrategyEtsXi.address);
    values.push(0);
    abis.push(StrategyEtsXi.interface.encodeFunctionData('grantRole', [Roles.DEFAULT_ADMIN_ROLE, Wallets.DEV]));

    await testProposal(addresses, values, abis);
    // await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

