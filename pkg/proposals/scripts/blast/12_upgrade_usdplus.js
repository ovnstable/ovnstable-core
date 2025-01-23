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

    let usdPlus = await getContract('UsdPlusToken', 'blast');
    let oldUsdImpl = '0x6002054688d62275d80CC615f0F509d9b2FF520d';
    let usdPlusImp = '0x2Ce8Bef4d06d7aD0Bca84a079BC11A877d6e0D0d';

    addProposalItem(usdPlus, 'upgradeTo', [usdPlusImp]);
    addProposalItem(usdPlus, 'transferStuckTokens', [
        '0x147e7416d5988B097B3A1859eFECC2C5e04FDf96',
        '0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46',
        BigInt(1448 * 10 ** 18),
    ]);
    addProposalItem(usdPlus, 'upgradeTo', [oldUsdImpl]);
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
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
