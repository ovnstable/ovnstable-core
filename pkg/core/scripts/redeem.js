const {toE6} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");


async function main() {

    let exchange = await getContract('Exchange');
    let usdPlusToken = await getContract('UsdPlusToken');
    let asset = await getCoreAsset();

    await showM2M();

    let amount = await usdPlusToken.balanceOf(await getWalletAddress());

    await (await usdPlusToken.approve(exchange.address, amount)).wait();
    console.log('UsdPlus approve done');
    await (await exchange.redeem(asset.address, amount)).wait();
    console.log('Exchange.redeem done');

    await showM2M();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

