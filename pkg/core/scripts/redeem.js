const {toE6} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset} = require("@overnight-contracts/common/utils/script-utils");


async function main() {

    let exchange = await getContract('Exchange');
    let usdPlusToken = await getContract('UsdPlusToken');
    let asset = await getCoreAsset();

    await showM2M();

    await (await usdPlusToken.approve(exchange.address, toE6(5))).wait();
    console.log('UsdPlus approve done');
    await (await exchange.redeem(asset.address, toE6(5))).wait();
    console.log('Exchange.redeem done');

    await showM2M();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

