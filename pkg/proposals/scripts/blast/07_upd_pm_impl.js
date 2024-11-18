const hre = require('hardhat');
const { getContract } = require('@overnight-contracts/common/utils/script-utils');
const { createProposal, testProposal } = require('@overnight-contracts/common/utils/governance');

const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf('.js'));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'blast');
    
    addProposalItem(pm, 'upgradeTo', ['0xB5900912Ee8A80375f85603149693971e84C72F2']);
    
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
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
