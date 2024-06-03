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

    let mendiUsdt = await getContract('StrategyMendiUsdt', 'linea_usdt');
    let beta = await getContract('StrategyEtsBeta', 'linea_usdt');
    let exchangeUsdt = await getContract('Exchange', 'linea_usdt');
    let usdplusUsdt = await getContract('UsdPlusToken', 'linea_usdt');
    let payoutUsdt = await getContract('LineaPayoutManager', 'linea_usdt');
    let pmUsdt = await getContract('PortfolioManager', 'linea_usdt');

    let implEx = '';
    let implUsdtp = '';
    let implBeta = '';

    addProposalItem(beta, 'upgradeTo', [implBeta]);

    addProposalItem(exchange, 'unpause', []);
    addProposalItem(usdplus, 'unpause', []);

    addProposalItem(pm, 'removeStrategy', ['0x30F8685fA6C2c9f75f6242f36C4b00dfc2DF9ab8']); //beta linea

    addProposalItem(payout, 'removeItems', []);
    addProposalItem(exchange, 'upgradeTo', [implEx]);
    addProposalItem(usdplus, 'upgradeTo', [implUsdp]);

    addProposalItem(pm, 'balance', []);

    addProposalItem(exchange, 'negativeRebase', []);

    addProposalItem(exchange, 'pause', []);
    addProposalItem(usdplus, 'pause', []);

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
