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
    let payout = await getContract('OptimismPayoutManager', 'zksync');
    let pm = await getContract('PortfolioManager', 'zksync');

    let implEx = '';
    let implUsdp = '0x2D768AFcB9147Cd2989BBCf90F45Fc506a3D59d0';

    addProposalItem(exchange, 'upgradeTo', [implEx]);
    addProposalItem(usdplus, 'upgradeTo', [implUsdp]);

    addProposalItem(exchange, 'unpause', []);
    addProposalItem(usdplus, 'unpause', []);

    addProposalItem(payout, 'removeItems', []);

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
