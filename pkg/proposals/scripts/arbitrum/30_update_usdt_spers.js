const hre = require("hardhat");
const { getContract, showM2M, execTimelock } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const { prepareEnvironment } = require("@overnight-contracts/common/utils/tests");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'arbitrum_usdt');

    // addresses.push(pm.address);
    // values.push(0);
    // abis.push(pm.interface.encodeFunctionData('removeStrategy', ['0xEAF3Bc644bDa5aEc842fC1d3937A533EF67887B6']));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('addStrategy', ['0xD025E837F94847fa657Db5a9812078A3B28A494c']));

    // await testProposal(addresses, values, abis);
    await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

