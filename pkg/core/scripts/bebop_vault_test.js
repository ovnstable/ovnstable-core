const { initWallet, transferETH, getContract, getERC20 } = require('@overnight-contracts/common/utils/script-utils');
const { ARBITRUM } = require('@overnight-contracts/common/utils/assets');
const { toE6 } = require('@overnight-contracts/common/utils/decimals');

async function main() {
    let wallet = await initWallet();

    await transferETH(1, wallet.address);

    let bebopVault = await getContract('BebopVault', 'localhost');

    await bebopVault.addWithdrawer(wallet.address);

    let usdc = await getERC20('usdcCircle');

    // --- deposit

    let balanceWallet = await usdc.balanceOf(wallet.address);
    console.log('balanceWallet before deposit', balanceWallet.toString());

    let balanceVault = await bebopVault.getERC20Balance(ARBITRUM.usdcCircle);
    console.log('balanceVault before deposit', balanceVault.toString());

    await usdc.connect(wallet).transfer(bebopVault.address, toE6(11));

    balanceWallet = await usdc.balanceOf(wallet.address);
    console.log('balanceWallet after deposit', balanceWallet.toString());

    balanceVault = await bebopVault.getERC20Balance(ARBITRUM.usdcCircle);
    console.log('balanceVault after deposit', balanceVault.toString());

    // --- withdraw

    await bebopVault.withdrawERC20(ARBITRUM.usdcCircle, toE6(10));

    balanceWallet = await usdc.balanceOf(wallet.address);
    console.log('balanceWallet after withdraw', balanceWallet.toString());

    balanceVault = await bebopVault.getERC20Balance(ARBITRUM.usdcCircle);
    console.log('balanceVault after withdraw', balanceVault.toString());

    // --- approve

    await bebopVault.approveERC20(ARBITRUM.usdcCircle, '0xbbbbbBB520d69a9775E85b458C58c648259FAD5F', toE6(10));

    let allowance = await usdc.allowance(bebopVault.address, '0xbbbbbBB520d69a9775E85b458C58c648259FAD5F');
    console.log('allowance', allowance.toString());
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
