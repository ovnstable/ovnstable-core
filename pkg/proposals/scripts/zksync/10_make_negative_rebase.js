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
    let alphaZk = await getContract('StrategyEtsGamma', 'zksync');
    let zeroLend = await getContract('StrategyZerolend', 'zksync');

    let implEx = '';
    let implUsdp = '';
    let implAlphaZk = '';

    addProposalItem(alphaZk, 'upgradeTo', [implAlphaZk]);

    addProposalItem(exchange, 'unpause', []);
    addProposalItem(usdplus, 'unpause', []);

    addProposalItem(pm, 'removeStrategy', ['0x9C6E45e5b06B1430FDF190ae0A39Af5f22FcF6FB']); //sonne usdc
    addProposalItem(pm, 'removeStrategy', ['0x0f6C2C868b94Ca6f00F77674009b34E0C9e67dB8']); //gamma op
    addProposalItem(pm, 'removeStrategy', ['0x09aeE63ea7b3C81cCe0E3b047acb2878e1135EE5']); //gamma beta

    addProposalItem(payout, 'removeItems', []);
    addProposalItem(exchange, 'upgradeTo', [implEx]);
    addProposalItem(usdplus, 'upgradeTo', [implUsdp]);

    addProposalItem(pm, 'balance', []);

    addProposalItem(exchange, 'negativeRebase', []);

    addProposalItem(exchange, 'pause', []);
    addProposalItem(usdplus, 'pause', []);

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
