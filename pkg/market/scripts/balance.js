const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {fromUSDC} = require("@overnight-contracts/common/utils/decimals");
const {fromE18} = require("../../common/utils/decimals");

async function main() {


    let strategy = await getContract('StrategyUsdPlusWmatic', 'polygon_dev');
    let items = await strategy.balances();

    let arrays = [];
    for (let i = 0; i < items.length; i++) {

        let item = items[i];

        arrays.push({
            name: item[0],
            amountUSDC: fromUSDC(item[1].toString()),
            amount: fromE18(item[2].toString()),
            borrowed: item[3].toString()
        })

    }

    console.table(arrays);

    let rebase = await getContract('RebaseTokenUsdPlusWmatic', 'polygon_dev');

    let newVar = await getPrice();
    newVar.gasLimit = 15000000;
    console.log('Liq index:    ' + await rebase.liquidityIndex());
    console.log('Total Rebase: ' + fromUSDC(await rebase.totalSupply()));
    console.log('Total NAV:    ' + fromUSDC(await strategy.netAssetValue()));
    console.log('HF:           ' + fromUSDC(await strategy.currentHealthFactor()));

    await (await strategy.balance(newVar)).wait();

    items = await strategy.balances();

    arrays = [];
    for (let i = 0; i < items.length; i++) {

        let item = items[i];

        arrays.push({
            name: item[0],
            amountUSDC: fromUSDC(item[1].toString()),
            amount: fromE18(item[2].toString()),
            borrowed: item[3].toString()
        })

    }

    console.table(arrays);

    console.log('Liq index:    ' + await rebase.liquidityIndex());
    console.log('Total Rebase: ' + fromUSDC(await rebase.totalSupply()));
    console.log('Total NAV:    ' + fromUSDC(await strategy.netAssetValue()));
    console.log('HF:           ' + fromUSDC(await strategy.currentHealthFactor()));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
