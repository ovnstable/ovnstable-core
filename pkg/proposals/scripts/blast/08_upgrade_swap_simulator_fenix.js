const { getContract, showM2M, initWallet, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let fenixSwap = await getContract('SwapSimulatorFenix', 'blast');
    let newImplementation = "0xa6746cCBf2508f3aFDA0a691D155eda50680C1E4"

    addProposalItem(fenixSwap, 'upgradeTo', [newImplementation])
    // abis.push(fenixSwap.interface.encodeFunctionData('upgradeTo', [newImplementation]));

    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }

    // await testProposal(addresses, values, abis);
    await createProposal(filename, addresses, values, abis);
}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

