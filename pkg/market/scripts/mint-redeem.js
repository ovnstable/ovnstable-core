const {getContract, getPrice, showHedgeM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {toE6} = require("@overnight-contracts/common/utils/decimals");

async function main() {

    let exchange = await getContract('Exchange');
    let usdPlus = await getContract('UsdPlusToken');
    let exchanger = await getContract('HedgeExchanger' + process.env.ETS);
    let strategy = await getContract('Strategy' + process.env.ETS);
    let ets = await getContract('Ets' + process.env.ETS);

    await showHedgeM2M();

    await execTimelock(async (timelock)=>{
        await exchange.connect(timelock).grantRole(await exchange.FREE_RIDER_ROLE(), strategy.address);
    });
    console.log('FREE_RIDER_ROLE granted');

    let price = await getPrice();

    await (await usdPlus.approve(exchanger.address, toE6(10), price)).wait();
    console.log('Approve usdPlus done');

    await (await exchanger.buy(toE6(10), price)).wait();
    console.log('Exchanger.buy done');

    await showHedgeM2M();

    await (await ets.approve(exchanger.address, toE6(5), price)).wait();
    console.log('Approve ets done');

    await (await exchanger.redeem(toE6(5), price)).wait();
    console.log('Exchanger.redeem done');

    await showHedgeM2M();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
