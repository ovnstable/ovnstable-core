const { verify } = require("@overnight-contracts/common/utils/verify-utils");
const {getContract, initWallet, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {toE6, fromE6} = require("@overnight-contracts/common/utils/decimals");
const {fromE18} = require("../../common/utils/decimals");

async function main() {

    let wallet = await initWallet();

    let usdPlus = await getContract('UsdPlusToken', 'polygon');
    let strategy = await getContract('StrategyUsdPlusWmatic', 'polygon_dev');
    let rebase = await getContract('RebaseTokenUsdPlusWmatic', 'polygon_dev');

    console.log("Rebase: " + fromE6(await rebase.balanceOf(wallet.address)))
    console.log("usdPlus: " + fromE6(await usdPlus.balanceOf(wallet.address)))

    let items = await strategy.balances();

    let arrays = [];
    for (let i = 0; i < items.length; i++) {

        let item = items[i];

        arrays.push({
            name: item[0],
            amountUSDC: fromE6(item[1].toString()),
            amount: fromE18(item[2].toString()),
            borrowed: item[3].toString()
        })

    }

    console.table(arrays);

    console.log('Liq index:    ' + await rebase.liquidityIndex());
    let rebaseTotal = fromE6(await rebase.totalSupply());
    console.log('Total Rebase: ' + rebaseTotal);
    let netAssetValue = fromE6(await strategy.netAssetValue());
    console.log('Total NAV:    ' + netAssetValue);
    console.log('HF:           ' + fromE6(await strategy.currentHealthFactor()));
    console.log('Diff:         '  + (rebaseTotal - netAssetValue));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
