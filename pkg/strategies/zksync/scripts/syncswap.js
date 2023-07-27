const {getContract, getERC20ByAddress, getWalletAddress, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {toE6, fromE6} = require("@overnight-contracts/common/utils/decimals");

async function main() {

    let price = await getPrice();

    let strategy = await getContract('StrategySyncswapUsdcUsdt', 'localhost');
    let usdc = await getERC20ByAddress('0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4');
    let walletAddress = await getWalletAddress();

    await (await strategy.setPortfolioManager(walletAddress, price)).wait();
    console.log('setPortfolioManager done');

    await (await usdc.transfer(strategy.address, toE6(3), price)).wait();
    console.log('transfer done');

    await (await strategy.stake(usdc.address, toE6(3), price)).wait();
    console.log('stake done');

    await (await usdc.transfer(strategy.address, toE6(3), price)).wait();
    console.log('transfer done');

    await (await strategy.stake(usdc.address, toE6(3), price)).wait();
    console.log('stake done');

    await (await strategy.unstake(usdc.address, toE6(3), walletAddress, false, price)).wait();
    console.log('unstake done');

    await (await strategy.unstake(usdc.address, toE6(3), walletAddress, true, price)).wait();
    console.log('unstakeFull done');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

