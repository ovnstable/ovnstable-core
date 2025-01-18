const { getContract, showM2M, initWallet, transferETH } = require('@overnight-contracts/common/utils/script-utils');
const { createProposal, testProposal, testUsdPlus, testStrategy } = require('@overnight-contracts/common/utils/governance');
const { Roles } = require('@overnight-contracts/common/utils/roles');
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf('.js'));
const { getStrategyFenixSwapParams } = require('../../../strategies/blast/deploy/03_fenix_swap');

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let usdPlus = await getContract('UsdPlusToken', 'localhost');
    let usdPlusImp = '0xAFf919098df69812Bb772a85283b55E913F2Bf71';

    addProposalItem(usdPlus, 'upgradeTo', [usdPlusImp]);

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
