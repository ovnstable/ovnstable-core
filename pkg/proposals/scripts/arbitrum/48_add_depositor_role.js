const hre = require('hardhat');
const { getContract, showM2M, execTimelock, initWallet, getERC20ByAddress } = require('@overnight-contracts/common/utils/script-utils');
const { createProposal, testProposal, testUsdPlus, testStrategy } = require('@overnight-contracts/common/utils/governance');
const { Roles } = require('@overnight-contracts/common/utils/roles');
const path = require('path');
const { ARBITRUM } = require('@overnight-contracts/common/utils/assets');
const { rmSync } = require('fs');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf('.js'));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let rm = await getContract('RoleManager', 'arbitrum');

    let impl = '0x94df6e4B02F755C0A856617DF50EB8236110f076';

    addProposalItem(rm, 'upgradeTo', [impl]);

    await testProposal(addresses, values, abis);
    await testUsdPlus(filename, 'arbitrum');

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
