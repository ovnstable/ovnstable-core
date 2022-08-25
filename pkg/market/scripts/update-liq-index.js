const {getContract, getPrice, initWallet} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let contract = await getContract('RebaseTokenUsdPlusWbnb');
    let exchange = await getContract('HedgeExchangerUsdPlusWbnb');

    let wallet = await initWallet();
    // await (await contract.setExchanger(wallet.address)).wait();
    // await (await contract.setLiquidityIndex('1000000000000000000000000000')).wait();
    // await (await contract.burn('0x9030d5c596d636eefc8f0ad7b2788ae7e9ef3d46', await contract.balanceOf('0x9030d5c596d636eefc8f0ad7b2788ae7e9ef3d46'))).wait();
    // await (await contract.setExchanger(exchange.address)).wait();

   // await (await exchange.setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60)).wait();

    await (await exchange.setAbroad(1000001, 1000950)).wait();

    // console.log((await contract.liquidityIndex()).toString());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
