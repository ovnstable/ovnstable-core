const hre = require('hardhat');
const { getContract, showM2M, execTimelock } = require('@overnight-contracts/common/utils/script-utils');
const { createProposal, testProposal, testUsdPlus, testStrategy } = require('@overnight-contracts/common/utils/governance');

const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf('.js'));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'base');
    
    addProposalItem(pm, 'upgradeTo', ['0xb008d09D25F06799e4081877A6bB185d89D893d3']);
    
    await testProposal(addresses, values, abis);
    // await testUsdPlus(filename, 'arbitrum');

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
