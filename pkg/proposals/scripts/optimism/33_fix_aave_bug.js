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

    const StrategyAave = await getContract('StrategyAave', 'optimism');
    const newAaveImpl = "0x53e24706D6642CA495498557415b1af7A025D8Da";

    addProposalItem(StrategyAave, "upgradeTo", [newAaveImpl]);

    addProposalItem(StrategyAave, "setStrategyName", ["AAVE"]);

    await testProposal(addresses, values, abis);
    await testUsdPlus(filename, 'optimism');

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
