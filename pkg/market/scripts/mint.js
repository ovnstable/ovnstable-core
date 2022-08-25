const {getContract, getPrice, showHedgeM2M} = require("@overnight-contracts/common/utils/script-utils");
const {toE6} = require("@overnight-contracts/common/utils/decimals");

async function main() {


    let usdPlus = await getContract('UsdPlusToken');
    let exchanger = await getContract('HedgeExchangerUsdPlusWbnb');

    await showHedgeM2M();

    let price = await getPrice();

    await (await usdPlus.approve(exchanger.address, toE6(4), price)).wait();

    console.log('Approve done');
    await (await exchanger.buy(toE6(4), price)).wait();
    console.log('Exchanger.buy done')

    await showHedgeM2M();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
