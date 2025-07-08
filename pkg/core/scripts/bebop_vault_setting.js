const { initWallet, transferETH, getContract, getERC20 } = require('@overnight-contracts/common/utils/script-utils');
const { ARBITRUM } = require('@overnight-contracts/common/utils/assets');
const { toE6 } = require('@overnight-contracts/common/utils/decimals');

async function main() {
    let bebopVault = await getContract('BebopVault');

    let bebopPmmWallet = '0x8dA55ae1B32efF20261b33C7e6Ea8f36fEC6218b';

    let bebopSettlement = await bebopVault.bebopSettlement();

    console.log('bebopSettlement', bebopSettlement);

    await bebopVault.addWithdrawer(bebopPmmWallet);
    console.log('addWithdrawer done()');

    let usdt = await getERC20('usdt');
    let xusd = await getERC20('usdPlus');
    let weth = await getERC20('weth');

    console.log('usdt', usdt.address);
    console.log('xusd', xusd.address);
    console.log('weth', weth.address);

    // --- approve

    let uint256max = 2n ** 256n - 1n;

    await bebopVault.approveERC20(usdt.address, bebopSettlement, uint256max.toString());
    await bebopVault.approveERC20(xusd.address, bebopSettlement, uint256max.toString());
    await bebopVault.approveERC20(weth.address, bebopSettlement, uint256max.toString());

    let allowanceUsdt = await usdt.allowance(bebopVault.address, bebopSettlement);
    let allowanceXusd = await xusd.allowance(bebopVault.address, bebopSettlement);
    let allowanceWeth = await weth.allowance(bebopVault.address, bebopSettlement);

    console.log('allowanceUsdt', allowanceUsdt.toString());
    console.log('allowanceXusd', allowanceXusd.toString());
    console.log('allowanceWeth', allowanceWeth.toString());

    // --- orderSigner

    await bebopVault.registerOrderSigner('0x8dA55ae1B32efF20261b33C7e6Ea8f36fEC6218b', true);
    console.log('registerOrderSigner done()');
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
