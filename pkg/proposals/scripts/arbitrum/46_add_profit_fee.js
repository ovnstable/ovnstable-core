const hre = require('hardhat');
const { getContract, showM2M, execTimelock, initWallet, getERC20ByAddress } = require('@overnight-contracts/common/utils/script-utils');
const { createProposal, testProposal, testUsdPlus, testStrategy } = require('@overnight-contracts/common/utils/governance');
const { Roles } = require('@overnight-contracts/common/utils/roles');
const path = require('path');
const { ARBITRUM } = require('@overnight-contracts/common/utils/assets');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf('.js'));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let exchange = await getContract('Exchange', 'arbitrum');
    let exchangeUsdt = await getContract('Exchange', 'arbitrum_usdt');

    let impl = '0x5B7f0e63C1D90700e2Ab57C974F10e8cD05446d7';

    addProposalItem(exchange, 'upgradeTo', [impl]);
    addProposalItem(exchangeUsdt, 'upgradeTo', [impl]);
    addProposalItem(exchange, 'setProfitFee', [20000, 100000]);
    addProposalItem(exchangeUsdt, 'setProfitFee', [20000, 100000]);

    // await testProposal(addresses, values, abis);

    // let wallet = await initWallet();
    // let usdc = await getERC20ByAddress(ARBITRUM.usdcCircle, wallet.address);
    // let usdt = await getERC20ByAddress(ARBITRUM.usdt, wallet.address);
    // console.log("usdc before", (await usdc.balanceOf("0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46")).toString());
    // console.log("usdt before", (await usdt.balanceOf("0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46")).toString());

    // await testUsdPlus(filename, 'arbitrum');
    // await testUsdPlus(filename, 'arbitrum_usdt');

    // console.log("usdc after", (await usdc.balanceOf("0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46")).toString());
    // console.log("usdt after", (await usdt.balanceOf("0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46")).toString());

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
