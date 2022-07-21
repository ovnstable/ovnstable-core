const { verify } = require("@overnight-contracts/common/utils/verify-utils");
const {getContract, initWallet, getPrice, getERC20} = require("@overnight-contracts/common/utils/script-utils");
const {toUSDC, fromUSDC} = require("@overnight-contracts/common/utils/decimals");
const {fromE18} = require("../../common/utils/decimals");

async function main() {



    let usdPlus = await getContract('UsdPlusToken', 'polygon');
    let exchangeUsdPlus = await getContract('Exchange', 'polygon');
    let rebase = await getContract('RebaseTokenUsdPlusWmatic', 'polygon_dev');
    let strategy = await getContract('StrategyUsdPlusWmatic', 'polygon_dev');
    let exchanger = await getContract('HedgeExchangerUsdPlusWmatic', 'polygon_dev');

    // let usdc = await getERC20('usdc');
    //
    // await usdc.approve(exchangeUsdPlus.address, toUSDC(7000));
    // await exchangeUsdPlus.buy(usdc.address, toUSDC(7000));


    await showETSM2M();

    let wallet= await initWallet();
    await (await usdPlus.approve(exchanger.address, await usdPlus.balanceOf(wallet.address), await getPrice())).wait();
    let params = await getPrice();
    params.gasLimit = 15000000;
    await (await exchanger.buy(await usdPlus.balanceOf(wallet.address), params)).wait();

    await showETSM2M();
}

async function showETSM2M() {

    let wallet = await initWallet();

    let usdPlus = await getContract('UsdPlusToken', 'polygon');
    let rebase = await getContract('RebaseTokenUsdPlusWmatic', 'polygon_dev');
    let strategy = await getContract('StrategyUsdPlusWmatic', 'polygon_dev');

    console.log('User balances:')
    console.log("Rebase:       " + fromUSDC(await rebase.balanceOf(wallet.address)))
    console.log("usdPlus:      " + fromUSDC(await usdPlus.balanceOf(wallet.address)))
    console.log('')

    console.log('ETS balances:')
    console.log('Total Rebase: ' + fromUSDC(await rebase.totalSupply()));
    console.log('Total NAV:    ' + fromUSDC(await strategy.netAssetValue()));
    console.log('HF:           ' + fromUSDC(await strategy.currentHealthFactor()));
    console.log('Liq index:    ' + await rebase.liquidityIndex());


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
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
