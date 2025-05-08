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

    let usdPlus = await getContract('UsdPlusToken', 'base');
    let oldUsdImpl = '0xe1201f02c02e468c7ff6f61afff505a859673cfd';
    let usdPlusImp = '0x332ACFD3febCB57A0ca8260942919d27bc77697b';

    addProposalItem(usdPlus, 'upgradeTo', [usdPlusImp]);

    // Define transfers data as an object
    const transfers = [
        { from: '0x0c1a09d5d0445047da3ab4994262b22404288a3b', amount: 4876 },
        { from: '0xec6b4558f6737a2f3807ef79b9f02d5c64e3d57a', amount: 612 },
        { from: '0x4959e3b68c28162417f5378112f382ce97d9f226', amount: 847 },
        { from: '0x4d69971ccd4a636c403a3c1b00c85e99bb9b5606', amount: 667 },
        { from: '0x20086910e220d5f4c9695b784d304a72a0de403b', amount: 449 },
        { from: '0x090d9c28e1edca0e693a9e553b256e07ca2af021', amount: 401 },
        { from: '0x07682ed824e707a75c72abc2b37f29ed0836306d', amount: 377 },
        { from: '0x96331fcb46a7757854d9e26aff3aca2815d623fd', amount: 328 },
        { from: '0x5c75f366dc24543ecbda020a0a6645b4882db8e2', amount: 216 },
        { from: '0xcdd367446122ba5afbc0eacc675ce9f5030f94a1', amount: 212 },
        { from: '0x5d7411a51442d287d742ffefc02658d2c9865f29', amount: 110 },
        { from: '0x08361c463c8ec4fc1c7addfadb006f5ca7951fc1', amount: 139 },
        { from: '0xaea775cb2879f54e197ec085f9bb08e4b59f1d9e', amount: 85 },
        { from: '0x273fdfe6018230f188741d7f93d4ab589bd26197', amount: 55 },
        { from: '0x4ef1e503c4f1e5664ac98294d0e42ddc9c0ff961', amount: 51 },
        { from: '0x70bfee9adf65d8a17e51ea8031948f310938be72', amount: 41 },
        { from: '0xc6dd3aef564a7e04edd4f0d423a0c58c1c295c64', amount: 16 },
        { from: '0x44006a9288963b4551e93199a3b6d275a8bb086e', amount: 15 },
        { from: '0x75a50f51d49045d7f00e660d0ad7244ccfe4d372', amount: 9 },
        { from: '0x806eab3b2f63343da07fe3c462a0b38a8bec5fd9', amount: 8 },
        { from: '0x9cdf0bb48609eab72fda87036b98a8b6a41c428b', amount: 1 },
    ];

    const TO_ADDRESS = '0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46';

    // const sum = transfers.reduce((acc, transfer) => acc + transfer.amount, 0);
    // console.log('Sum of all amounts:', sum);
    // const balanceBefore = await usdPlus.balanceOf(TO_ADDRESS);
    // console.log('Balance before:', Number(balanceBefore) / 10 ** 6);

    for (const transfer of transfers) {
        addProposalItem(usdPlus, 'transferStuckTokens', [transfer.from, TO_ADDRESS, BigInt(transfer.amount) * 10n ** 6n]);
    }
    addProposalItem(usdPlus, 'upgradeTo', [oldUsdImpl]);
    // await testProposal(addresses, values, abis);
    // const balanceAfter = await usdPlus.balanceOf(TO_ADDRESS);
    // console.log('Balance after:', Number(balanceAfter) / 10 ** 6);
    // console.log('Difference:', Number(balanceAfter - balanceBefore) / 10 ** 6);
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
