const hre = require("hardhat");
const { getContract } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus } = require("@overnight-contracts/common/utils/governance");

const path = require('path');

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let pm_usdt = await getContract('PortfolioManager', 'arbitrum_usdt');

    addProposalItem(pm_usdt, 'upgradeTo', ['0x8B268F288D233d3739Bc54C7cF8e857ea3e7bD32']);

    await testProposal(addresses, values, abis);

    await testUsdPlus(filename, 'arbitrum_usdt');

    console.log(await pm_usdt.getAllStrategyWeightsWithNames());

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
