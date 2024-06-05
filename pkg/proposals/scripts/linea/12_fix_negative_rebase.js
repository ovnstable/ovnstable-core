const { getContract, showM2M, initWallet, transferETH } = require('@overnight-contracts/common/utils/script-utils');
const { createProposal, testProposal, testUsdPlus, testStrategy } = require('@overnight-contracts/common/utils/governance');
const { Roles } = require('@overnight-contracts/common/utils/roles');
const { getImplementationAddress } = require('@openzeppelin/upgrades-core');
const path = require('path');
const { ethers } = require('hardhat');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf('.js'));

async function main() {
    let wallet = await initWallet();
    await transferETH(1, wallet.address);

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

    addProposalItem(payout, 'removeItems', []);
    addProposalItem(payoutUsdt, 'removeItems', []);
    addProposalItem(exchange, 'negativeRebasePools', ["914317529711360028780342093", "5272579780631420970344893754", ["0xbE23da11fbF9dA0F7C13eA73A4bB511b9Bc00177",
        "0x58aacbccaec30938cb2bb11653cad726e5c4194a", "0xc5f4c5c2077bbbac5a8381cf30ecdf18fde42a91", "0x93b6d53d8a33c92003D0c41065cb2842934C2619",
        "0x6F501662A76577FBB3Bb230Be5E8e69D41d8c711", "0x2c5455EC697254B9c649892eEd425126791e334a"]]);
    addProposalItem(exchangeUsdt, 'negativeRebasePools', ["946196274061462956380585316", "5181173126665482632471553232", ["0xbE23da11fbF9dA0F7C13eA73A4bB511b9Bc00177",
        "0x58aacbccaec30938cb2bb11653cad726e5c4194a", "0xc5f4c5c2077bbbac5a8381cf30ecdf18fde42a91", "0x93b6d53d8a33c92003D0c41065cb2842934C2619",
        "0x6F501662A76577FBB3Bb230Be5E8e69D41d8c711", "0x2c5455EC697254B9c649892eEd425126791e334a"]]);


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
