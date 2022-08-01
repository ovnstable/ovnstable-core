const {getContract, initWallet, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {fromE6} = require("@overnight-contracts/common/utils/decimals");
const {fromE18} = require("../../common/utils/decimals");

async function main() {

    let exchanger = await getContract('HedgeExchangerUsdPlusWmatic');

    while (true) {

        await showETSM2M();

        let opts = await getPrice();
        opts.gasLimit = "15000000"

        try {
            await exchanger.estimateGas.payout(opts);
        } catch (e) {
            console.log(e)
            await sleep(30000);
            continue;
        }

        try {
            await (await exchanger.payout(opts)).wait();
            break;
        } catch (e) {
            console.log(e)
            await sleep(30000);
            continue;
        }
    }

    await showETSM2M();
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

async function showETSM2M() {

    let wallet = await initWallet();

    let usdPlus = await getContract('UsdPlusToken');
    let rebase = await getContract('RebaseTokenUsdPlusWmatic');
    let strategy = await getContract('StrategyUsdPlusWmatic');

    console.log('User balances:')
    console.log("Rebase:       " + fromE6(await rebase.balanceOf(wallet.address)))
    console.log("usdPlus:      " + fromE6(await usdPlus.balanceOf(wallet.address)))
    console.log('')

    console.log('ETS balances:')
    console.log('Total Rebase: ' + fromE6(await rebase.totalSupply()));
    console.log('Total NAV:    ' + fromE6(await strategy.netAssetValue()));
    console.log('HF:           ' + fromE6(await strategy.currentHealthFactor()));
    console.log('Liq index:    ' + await rebase.liquidityIndex());


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
}
