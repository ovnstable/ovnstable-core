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


    let implUsdp = '0x343B0C4e372DA18fAA625030AbdB532882175315';
    let implEx = '0xC1D72528dCac34189bF576838cC7b4C7735a3487';
    addProposalItem(exchange, 'upgradeTo', [implEx]);
    addProposalItem(usdplus, 'upgradeTo', [implUsdp]);
    addProposalItem(exchangeUsdt, 'upgradeTo', [implEx]);
    addProposalItem(usdplusUsdt, 'upgradeTo', [implUsdp]);
    addProposalItem(payout, 'removeItems', []);
    addProposalItem(payoutUsdt, 'removeItems', []);
    addProposalItem(exchange, 'negativeRebase', []);
    addProposalItem(exchangeUsdt, 'negativeRebase', []);


    await showM2M("linea");
    await showM2M("linea_usdt");
    await testProposal(addresses, values, abis);
    await showM2M("linea");
    await showM2M("linea_usdt");
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
