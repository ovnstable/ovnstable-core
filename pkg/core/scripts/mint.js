const { toE6} = require("@overnight-contracts/common/utils/decimals");

let {DEFAULT} = require('@overnight-contracts/common/utils/assets');
const {getContract, getERC20, showM2M} = require("@overnight-contracts/common/utils/script-utils");


async function main() {

    let exchange = await getContract('Exchange', process.env.STAND);
    let usdc = await getERC20('usdc');

    await showM2M();

    await (await usdc.approve(exchange.address, toE6(1))).wait();
    console.log('USDC approve done');
    await (await exchange.buy(DEFAULT.usdc, toE6(1))).wait();
    console.log('Exchange.buy done');

    await showM2M();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

