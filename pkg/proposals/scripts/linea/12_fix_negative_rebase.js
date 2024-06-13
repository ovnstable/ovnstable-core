const { getContract, showM2M, initWallet, transferETH } = require('@overnight-contracts/common/utils/script-utils');
const { createProposal, testProposal, testUsdPlus, testStrategy } = require('@overnight-contracts/common/utils/governance');
const { Roles } = require('@overnight-contracts/common/utils/roles');
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
const path = require('path');
const { ethers } = require('hardhat');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf('.js'));

async function main() {

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

    let implUsdp = '0xA4b2d722B919502439c1f4b39d08F80d52AB9cb3';
    let implEx = "0x6CA0Fd70e7F037d4a414A4b32AdF3c9a6a2f4834";
    addProposalItem(usdplus, 'upgradeTo', [implUsdp]);
    addProposalItem(usdplusUsdt, 'upgradeTo', [implUsdp]);
    addProposalItem(exchangeUsdt, 'upgradeTo', [implEx]);
    addProposalItem(exchange, 'upgradeTo', [implEx]);
    addProposalItem(exchange, 'unpause', []);
    addProposalItem(usdplus, 'unpause', []);
    addProposalItem(exchangeUsdt, 'unpause', []);
    addProposalItem(usdplusUsdt, 'unpause', []);

    addProposalItem(exchange, 'setTargetParams', ["914317529711360028780342093", "424178038498", "88788106772414687908"]);
    addProposalItem(exchangeUsdt, 'setTargetParams', ["946196274061462956380585316", "322291673255", "32797371192812997663"]);

    addProposalItem(payout, 'removeItems', []);
    addProposalItem(payoutUsdt, 'removeItems', []);

    addProposalItem(exchange, 'negativeRebase', []);
    addProposalItem(exchangeUsdt, 'negativeRebase', []);
    let implExOld = '0x61e7BF9B82F3b0B9b490F6db9C2A582358907d2A';
    let implUsdpOld = '0xB0992A4108Bd1cf0f8e429Fc0A1D7073C7dD9Fd2';
    addProposalItem(exchange, 'upgradeTo', [implExOld]);
    addProposalItem(usdplus, 'upgradeTo', [implUsdpOld]);
    addProposalItem(exchangeUsdt, 'upgradeTo', [implExOld]);
    addProposalItem(usdplusUsdt, 'upgradeTo', [implUsdpOld]);
    // await showM2M("linea");
    // await showM2M("linea_usdt");
    // await testProposal(addresses, values, abis);
    // await showM2M("linea");
    // await showM2M("linea_usdt");

    // await testUsdPlus(filename, 'linea');
    // await testUsdPlus(filename, 'linea_usdt');

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
