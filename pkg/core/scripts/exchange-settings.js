const {toAsset, toE6} = require("@overnight-contracts/common/utils/decimals");

const {
    getContract,
    getCoreAsset, getPrice,
} = require("@overnight-contracts/common/utils/script-utils");


async function main() {

    let exchange = await getContract('Exchange');

    let price = await getPrice();

    await (await exchange.setOracleLoss(100, 100000, price)).wait(); // 0.1%
    console.log('exchange.setOracleLoss');

    await (await exchange.setCompensateLoss(10, 100000, price)).wait(); // 0.01%
    console.log('exchange.setCompensateLoss');

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

