const {getContract} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let exchange = await getContract('Exchange');

    await (await exchange.setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60)).wait();
    console.log('Reset payout time done()');

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

