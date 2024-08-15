const hre = require("hardhat");
const { getContract, showM2M, execTimelock } = require("@overnight-contracts/common/utils/script-utils");
const {
    createProposal,
    testProposal,
    testUsdPlus,
    testStrategy
} = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const { prepareEnvironment } = require("@overnight-contracts/common/utils/tests");
const { strategySiloUsdc } = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const { ethers } = require("hardhat");
const { strategyEtsEtaParams } = require("@overnight-contracts/strategies-base/deploy/11_ets_eta");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let m2m = await getContract('Mark2Market', 'blast');
    let timelock = "0xa44dF8A8581C2cb536234E6640112fFf932ED2c4";
    let dev = "0x05129E3CE8C566dE564203B0fd85111bBD84C424";

    addresses.push(m2m.address);
    values.push(0);
    abis.push(m2m.interface.encodeFunctionData('grantRole', [Roles.DEFAULT_ADMIN_ROLE, dev]));

    addresses.push(m2m.address);
    values.push(0);
    abis.push(m2m.interface.encodeFunctionData('revokeRole', [Roles.DEFAULT_ADMIN_ROLE, timelock]));

    // await testProposal(addresses, values, abis);
    // await testUsdPlus(filename, 'base');
    await createProposal(filename, addresses, values, abis);

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

