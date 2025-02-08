const { getContract, showM2M, initWallet, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { BASE, COMMON } = require("@overnight-contracts/common/utils/assets");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let aerodromSwap = await getContract('StrategyAerodromeSwapUsdc', 'base_usdc');
    let aerodromSwapImp = "0x0dAE4FF7E7039779874C22d9c5454eb6c7bF6AFc"

    addProposalItem(aerodromSwap, 'upgradeTo', [aerodromSwapImp])

    // await testProposal(addresses, values, abis);
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