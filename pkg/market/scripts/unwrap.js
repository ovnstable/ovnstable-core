const { verify } = require("@overnight-contracts/common/utils/verify-utils");
const {getContract, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");
const {fromAsset, toAsset} = require("@overnight-contracts/common/utils/decimals");

async function main() {

    let market = await getContract('Market');
    let usdPlus = await getContract('UsdPlusToken');
    let wUsdPlus = await getContract('WrappedUsdPlusToken');

    let address = await getWalletAddress();

    let amount = await wUsdPlus.balanceOf(address);


    console.log('USD+:  ' + fromAsset(await usdPlus.balanceOf(address)));
    console.log('wUSD+: ' + fromAsset(await wUsdPlus.balanceOf(address)));

    await (await wUsdPlus.approve(market.address, amount)).wait();
    console.log('Asset approve done');
    await (await market.unwrap(usdPlus.address, amount, address)).wait();
    console.log('market.unwrap done');

    console.log('USD+:  ' + fromAsset(await usdPlus.balanceOf(address)));
    console.log('wUSD+: ' + fromAsset(await wUsdPlus.balanceOf(address)));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
