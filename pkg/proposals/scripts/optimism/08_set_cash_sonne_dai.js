const hre = require("hardhat");
const {getContract, showM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'optimism_dai');
    let strategy = await getContract('StrategySonneDai', 'optimism_dai');


    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('addStrategy', [strategy.address]));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('setCashStrategy', [strategy.address]));

    await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

