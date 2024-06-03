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

    // let mendi = await getContract('StrategyMendiUsdt', 'linea');
    let exchange = await getContract('Exchange', 'linea');
    let usdplus = await getContract('UsdPlusToken', 'linea');
    let payout = await getContract('LineaPayoutManager', 'linea');
    let pm = await getContract('PortfolioManager', 'linea');

    let implEx = '0xeDE3D783523F9a2E1Ad74E4853EdE457e0Fb9525';
    let implUsdp = '0x3aB4838Caf3FA3d4825731A959F2dC73d30632F1';

    // addProposalItem(exchange, 'unpause', []);
    // addProposalItem(usdplus, 'unpause', []);

    // addProposalItem(payout, 'removeItems', []);
    // addProposalItem(exchange, 'upgradeTo', [implEx]);
    // addProposalItem(usdplus, 'upgradeTo', [implUsdp]);

    addProposalItem(pm, 'balance', []);

    addProposalItem(exchange, 'negativeRebase', []);


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
