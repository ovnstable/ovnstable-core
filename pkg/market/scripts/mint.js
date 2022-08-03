const {getContract, getPrice, showHedgeM2M} = require("@overnight-contracts/common/utils/script-utils");
const {toE6} = require("@overnight-contracts/common/utils/decimals");

async function main() {


    let usdPlus = await getContract('UsdPlusToken');
    let exchanger = await getContract('HedgeExchangerUsdPlusWmatic');


    await showHedgeM2M();

    await (await usdPlus.approve(exchanger.address, toE6(5), await getPrice())).wait();
    let params = await getPrice();
    params.gasLimit = 15000000;
    await (await exchanger.buy(toE6(5), params)).wait();

    await showHedgeM2M();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
