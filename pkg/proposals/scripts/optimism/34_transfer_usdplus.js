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

    let usdPlus = await getContract('UsdPlusToken', 'optimism');
    let oldUsdImpl = '0x6002054688d62275d80cc615f0f509d9b2ff520d';
    let usdPlusImp = '0x38b4B68B9b1A5d05Ffd14C6A80bde03439D73250';

    addProposalItem(usdPlus, 'upgradeTo', [usdPlusImp]);

    // Define transfers data as an object
    const transfers = [
        { from: '0xfc1505b3d4cd16bb2336394ad11071638710950f', amount: 192 },
        { from: '0x2582886f65ea71ecd3cffd12089c55fb9c75e9db', amount: 26 },
    ];

    const TO_ADDRESS = '0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46';
    // const sum = transfers.reduce((acc, transfer) => acc + transfer.amount, 0);
    // console.log('Sum of all amounts:', sum);
    // const balanceBefore = await usdPlus.balanceOf(TO_ADDRESS);
    // console.log('Balance before:', Number(balanceBefore) / 10 ** 6);

    // Loop through transfers and create proposal items
    for (const transfer of transfers) {
        addProposalItem(usdPlus, 'transferStuckTokens', [transfer.from, TO_ADDRESS, BigInt(transfer.amount) * 10n ** 6n]);
    }

    addProposalItem(usdPlus, 'upgradeTo', [oldUsdImpl]);
    // await testProposal(addresses, values, abis);
    await createProposal(filename, addresses, values, abis);
    // const balanceAfter = await usdPlus.balanceOf(TO_ADDRESS);
    // console.log('Balance after:', Number(balanceAfter) / 10 ** 6);
    // console.log('Difference:', Number(balanceAfter - balanceBefore) / 10 ** 6);

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
