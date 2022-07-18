const {verify} = require("@overnight-contracts/common/utils/verify-utils");
const {getContract, initWallet, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {toUSDC, fromUSDC} = require("@overnight-contracts/common/utils/decimals");
const {evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {fromE18} = require("../../common/utils/decimals");

async function main() {



    let strategy = await getContract('StrategyUsdPlusWmatic', 'localhost');
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

    let exchanger = await getContract('HedgeExchangerUsdPlusWmatic', 'polygon_dev');
    let rebase = await getContract('RebaseTokenUsdPlusWmatic', 'polygon_dev');

    let newVar = await getPrice();
    newVar.gasLimit = 15000000;
    console.log('Liq index:    ' + await rebase.liquidityIndex());
    console.log('Total Rebase: ' + fromUSDC(await rebase.totalSupply()));
    console.log('Total NAV:    ' + fromUSDC(await strategy.netAssetValue()));

    await (await exchanger.setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60, await getPrice())).wait();
    await (await exchanger.payout(await getPrice())).wait();

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
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

