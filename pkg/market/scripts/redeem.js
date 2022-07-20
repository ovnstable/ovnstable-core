const { verify } = require("@overnight-contracts/common/utils/verify-utils");
const {getContract, initWallet, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {toUSDC, fromUSDC} = require("@overnight-contracts/common/utils/decimals");
const {fromE18} = require("../../common/utils/decimals");

async function main() {

    let wallet = await initWallet();

    let usdPlus = await getContract('UsdPlusToken', 'polygon');

    let exchanger = await getContract('HedgeExchangerUsdPlusWmatic', 'polygon_dev');
    let rebase = await getContract('RebaseTokenUsdPlusWmatic', 'polygon_dev');
    let strategy = await getContract('StrategyUsdPlusWmatic', 'polygon_dev');

    console.log("Rebase:  " + fromUSDC(await rebase.balanceOf(wallet.address)))
    console.log("usdPlus: " + fromUSDC(await usdPlus.balanceOf(wallet.address)))
    console.log('HF:      ' + fromUSDC(await strategy.currentHealthFactor()));
    console.log('Total Rebase: ' + fromUSDC(await rebase.totalSupply()));
    console.log('Total NAV:    ' + fromUSDC(await strategy.netAssetValue()));

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


    let balance = await rebase.balanceOf(wallet.address);
    await (await rebase.approve(exchanger.address, balance, await getPrice())).wait();
    await (await exchanger.redeem(balance, await getPrice())).wait();

    console.log("Rebase:  " + fromUSDC(await rebase.balanceOf(wallet.address)))
    console.log("usdPlus: " + fromUSDC(await usdPlus.balanceOf(wallet.address)))
    console.log('HF:      ' + fromUSDC(await strategy.currentHealthFactor()));
    console.log('Total Rebase: ' + fromUSDC(await rebase.totalSupply()));
    console.log('Total NAV:    ' + fromUSDC(await strategy.netAssetValue()));


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
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
