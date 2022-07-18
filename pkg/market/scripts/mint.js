const { verify } = require("@overnight-contracts/common/utils/verify-utils");
const {getContract, initWallet, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {toUSDC, fromUSDC} = require("@overnight-contracts/common/utils/decimals");
const {fromE18} = require("../../common/utils/decimals");

async function main() {

    let wallet = await initWallet();

    let usdPlus = await getContract('UsdPlusToken', 'polygon');

    let exchanger = await getContract('HedgeExchangerUsdPlusWmatic', 'polygon_dev');
    let rebase = await getContract('RebaseTokenUsdPlusWmatic', 'polygon_dev');
    let strategy = await getContract('StrategyUsdPlusWmatic', 'localhost');

    console.log("NAV :    " + fromUSDC(await strategy.netAssetValue()))
    console.log("Rebase:  " + fromUSDC(await rebase.totalSupply()))

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

    // await (await usdPlus.approve(exchanger.address, toUSDC(1), await getPrice())).wait();
    // let params = await getPrice();
    // params.gasLimit = 15000000;
    // await (await exchanger.buy(toUSDC(1), params)).wait();

    // console.log("NAV : " + fromUSDC(await strategy.netAssetValue()))
    await (await strategy.balanceValue()).wait();
    // await (await strategy.test()).wait();

    console.log("NAV :    " + fromUSDC(await strategy.netAssetValue()))
    console.log("Rebase:  " + fromUSDC(await rebase.totalSupply()))


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
