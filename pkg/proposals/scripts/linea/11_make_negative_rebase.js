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

    let exchange = await getContract('Exchange', 'linea');
    let usdplus = await getContract('UsdPlusToken', 'linea');
    let payout = await getContract('LineaPayoutManager', 'linea');
    let pm = await getContract('PortfolioManager', 'linea');

    let exchangeUsdt = await getContract('Exchange', 'linea_usdt');
    let usdplusUsdt = await getContract('UsdPlusToken', 'linea_usdt');
    let payoutUsdt = await getContract('LineaPayoutManager', 'linea_usdt');
    let pmUsdt = await getContract('PortfolioManager', 'linea_usdt');

    let implEx = '';
    let implUsdp = '';
    addProposalItem(exchange, 'upgradeTo', [implEx]);
    addProposalItem(usdplus, 'upgradeTo', [implUsdp]);
    addProposalItem(exchangeUsdt, 'upgradeTo', [implEx]);
    addProposalItem(usdplusUsdt, 'upgradeTo', [implUsdp]);

    addProposalItem(exchange, 'unpause', []);
    addProposalItem(usdplus, 'unpause', []);
    addProposalItem(exchangeUsdt, 'unpause', []);
    addProposalItem(usdplusUsdt, 'unpause', []);

    addProposalItem(payout, 'removeItems', []);
    addProposalItem(payoutUsdt, 'removeItems', []);

    addProposalItem(pm, 'balance', []);
    addProposalItem(pmUsdt, 'balance', []);

    addProposalItem(exchange, 'negativeRebase', []);
    addProposalItem(exchangeUsdt, 'negativeRebase', []);


    await showM2M();
    await testProposal(addresses, values, abis);
    await showM2M();
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
