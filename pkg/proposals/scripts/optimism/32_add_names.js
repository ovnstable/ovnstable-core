const hre = require("hardhat");
const { getContract } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");

const path = require('path');

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'optimism');
    let timelock = await getContract('AgentTimelock', 'optimism');
    let rm = await getContract('RoleManager', 'optimism');

    const StrategyAave = await getContract('StrategyAave', 'optimism');
    const newAaveImpl = "0xEAEd84c2676F76760b9354153546484F488Fd9A6";

    addProposalItem(StrategyAave, "upgradeTo", [newAaveImpl]);

    addProposalItem(StrategyAave, 'setStrategyParams', [pm.address, rm.address, "AAVE"]);


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
