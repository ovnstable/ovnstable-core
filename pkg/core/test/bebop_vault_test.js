const { initWallet, transferETH, getContract, getERC20, transferAsset } = require('@overnight-contracts/common/utils/script-utils');
const { toE6 } = require('@overnight-contracts/common/utils/decimals');

async function main() {
    let wallet = await initWallet();
    console.log('wallet', wallet.address);

    await transferETH(1, wallet.address);

    let bebopVault = await getContract('BebopVault', 'localhost');

    let bebopSettlement = await bebopVault.bebopSettlement();

    console.log('bebopSettlement', bebopSettlement);

    await bebopVault.addWithdrawer(wallet.address);

    let usdc = await getERC20('usdc');

    await transferAsset(usdc.address, wallet.address, toE6(1000));

    // --- deposit

    let balanceWallet = await usdc.balanceOf(wallet.address);
    console.log('balanceWallet before deposit', balanceWallet.toString());

    let balanceVault = await bebopVault.getERC20Balance(usdc.address);
    console.log('balanceVault before deposit', balanceVault.toString());

    await usdc.connect(wallet).transfer(bebopVault.address, toE6(11));

    balanceWallet = await usdc.balanceOf(wallet.address);
    console.log('balanceWallet after deposit', balanceWallet.toString());

    balanceVault = await bebopVault.getERC20Balance(usdc.address);
    console.log('balanceVault after deposit', balanceVault.toString());

    // --- withdraw

    await bebopVault.withdrawERC20(usdc.address, toE6(10));

    balanceWallet = await usdc.balanceOf(wallet.address);
    console.log('balanceWallet after withdraw', balanceWallet.toString());

    balanceVault = await bebopVault.getERC20Balance(usdc.address);
    console.log('balanceVault after withdraw', balanceVault.toString());

    // --- approve

    await bebopVault.approveERC20(usdc.address, '0xbbbbbBB520d69a9775E85b458C58c648259FAD5F', toE6(10));

    let allowance = await usdc.allowance(bebopVault.address, '0xbbbbbBB520d69a9775E85b458C58c648259FAD5F');
    console.log('allowance', allowance.toString());
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
