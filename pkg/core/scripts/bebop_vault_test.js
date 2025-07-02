const { initWallet, transferETH, getContract, getERC20 } = require('@overnight-contracts/common/utils/script-utils');
const { ARBITRUM } = require('@overnight-contracts/common/utils/assets');
const { toE6 } = require('@overnight-contracts/common/utils/decimals');

async function main() {
    let wallet = await initWallet();

    await transferETH(1, wallet.address);

    let bebopVault = await getContract('BebopVault', 'localhost');

    await bebopVault.setVaultParams('0xD9F74C70c28bba1d9dB0c44c5a2651cBEB45f3BA');

    await bebopVault.addWithdrawer(wallet.address);

    let usdc = await getERC20('usdcCircle');

    await usdc.approve(bebopVault.address, toE6(10));

    // --- deposit

    let balanceWallet = await usdc.balanceOf(wallet.address);
    console.log('balanceWallet1', balanceWallet.toString());

    await bebopVault.depositERC20(ARBITRUM.usdcCircle, toE6(10));

    let balanceVault = await bebopVault.getERC20Balance(ARBITRUM.usdcCircle);
    console.log('balanceVault', balanceVault.toString());

    balanceWallet = await usdc.balanceOf(wallet.address);
    console.log('balanceWallet2', balanceWallet.toString());

    // --- withdraw

    await bebopVault.withdrawERC20(ARBITRUM.usdcCircle, wallet.address, toE6(10));

    balanceVault = await bebopVault.getERC20Balance(ARBITRUM.usdcCircle);
    console.log('balanceVault2', balanceVault.toString());

    balanceWallet = await usdc.balanceOf(wallet.address);
    console.log('balanceWallet3', balanceWallet.toString());

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
