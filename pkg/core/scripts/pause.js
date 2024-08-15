const { toAsset, toE6 } = require("@overnight-contracts/common/utils/decimals");

const {
    getContract,
    getCoreAsset,
} = require("@overnight-contracts/common/utils/script-utils");


async function main() {

    let exchange = await getContract('Exchange');
    let asset = await getCoreAsset();

    await (await exchange.pause()).wait();
    console.log('Pause done()');

    await (await exchange.buy(asset.address, toAsset(1))).wait();
    await (await exchange.redeem(asset.address, toE6(5))).wait();


}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

