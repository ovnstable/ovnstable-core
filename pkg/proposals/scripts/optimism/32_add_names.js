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

    let pm = await getContract('PortfolioManager', 'optimism');

    const StrategyAave = await getContract('StrategyAave', 'optimism');
    const newAaveImpl = "0x1236f2Bae307d9EFa1b055C2577613e07b1aaFa9";

    addProposalItem(StrategyAave, "upgradeTo", [newAaveImpl]);

    // addProposalItem(StrategyAave, "setSlippages", [1n, 1n, 1n]);
    addProposalItem(StrategyAave, "setStrategyName", ["AAVE"]);

    addProposalItem(pm, "upgradeTo", ["0x80212Fc2baa3782eC0B5384fFe6E1ED8306340b0"]);

    // await testProposal(addresses, values, abis);
    // await testUsdPlus(filename, 'optimism');

    await createProposal(filename, addresses, values, abis);

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
