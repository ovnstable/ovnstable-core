const { getContract, showM2M, initWallet, transferETH } = require('@overnight-contracts/common/utils/script-utils');
const { createProposal, testProposal, testUsdPlus, testStrategy } = require('@overnight-contracts/common/utils/governance');
const { Roles } = require('@overnight-contracts/common/utils/roles');
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf('.js'));
const { getStrategyFenixSwapParams } = require('../../../strategies/blast/deploy/03_fenix_swap');

async function main() {
    const TO_ADDRESS = '0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46';
    // await transferETH(1, TO_ADDRESS);
    let addresses = [];
    let values = [];
    let abis = [];

    let usdPlus = await getContract('UsdPlusToken', 'blast');
    let oldUsdImpl = '0x6002054688d62275d80CC615f0F509d9b2FF520d';
    let usdPlusImp = '0xC21bD359e33047d911A2547ec7F5989e7db75F5d';

    addProposalItem(usdPlus, 'upgradeTo', [usdPlusImp]);

    // Define transfers data as an object
    const transfers = [{ from: '0x147e7416d5988b097b3a1859efecc2c5e04fdf96', amount: 169 }];

    // const sum = transfers.reduce((acc, transfer) => acc + transfer.amount, 0);
    // console.log('Sum of all amounts:', sum);
    // const balanceBefore = await usdPlus.balanceOf(TO_ADDRESS);
    // console.log('Balance before:', Number(balanceBefore) / 10 ** 18);

    // Loop through transfers and create proposal items
    for (const transfer of transfers) {
        addProposalItem(usdPlus, 'transferStuckTokens', [transfer.from, TO_ADDRESS, BigInt(transfer.amount) * 10n ** 18n]);
    }

    addProposalItem(usdPlus, 'upgradeTo', [oldUsdImpl]);
    // await testProposal(addresses, values, abis);
    await createProposal(filename, addresses, values, abis);
    // const balanceAfter = await usdPlus.balanceOf(TO_ADDRESS);
    // console.log('Balance after:', Number(balanceAfter) / 10 ** 18);
    // console.log('Difference:', Number(balanceAfter - balanceBefore) / 10 ** 18);

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
