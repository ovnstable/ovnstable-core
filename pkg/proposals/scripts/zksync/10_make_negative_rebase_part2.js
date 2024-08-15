const { getContract, showM2M, initWallet, transferETH } = require('@overnight-contracts/common/utils/script-utils');
const { createProposal, testProposal, testUsdPlus, testStrategy } = require('@overnight-contracts/common/utils/governance');
const { Roles } = require('@overnight-contracts/common/utils/roles');
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
const path = require('path');
const { ethers } = require('hardhat');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf('.js'));

async function main() {
    // let wallet = await initWallet();
    // await transferETH(1, wallet.address);

    let addresses = [];
    let values = [];
    let abis = [];


    let exchange = await getContract('Exchange', 'zksync');
    let usdplus = await getContract('UsdPlusToken', 'zksync');
    let payout = await getContract('ZkSyncPayoutManager', 'zksync');
    let pm = await getContract('PortfolioManager', 'zksync');

    let implEx = '0x4872a592854FDaE12233792D5441e666CAC861AB';
    let implUsdp = '0xC95362d8AB474D8993af0387ce05E4Cc7328A093';

    addProposalItem(exchange, 'negativeRebase', []);

    // addProposalItem(exchange, 'pause', []);
    // addProposalItem(usdplus, 'pause', []);


    // await showM2M();
    // await testProposal(addresses, values, abis);
    // await showM2M();
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
