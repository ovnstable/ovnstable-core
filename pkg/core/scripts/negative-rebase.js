const {getContract, getPrice, initWallet, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {fromE6} = require("@overnight-contracts/common/utils/decimals");

async function main() {

    let exchange = await getContract('Exchange');
    let usdPlus = await getContract('UsdPlusToken');
    let m2m = await getContract('Mark2Market');

    console.log('NAV:   ' + fromE6(await m2m.totalNetAssets()));
    console.log('Total: ' + fromE6(await usdPlus.totalSupply()));
    console.log('Index: ' + await usdPlus.liquidityIndex());

    await (await exchange.negativeRebase()).wait();

    console.log('NAV:   ' + fromE6(await m2m.totalNetAssets()));
    console.log('Total: ' + fromE6(await usdPlus.totalSupply()));
    console.log('Index: ' + await usdPlus.liquidityIndex());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
