const {getContract} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let exchange = await getContract('Exchange');

    await (await exchange.setPayoutTimes(1734019200, 21600, 0)).wait();
    console.log('Reset payout time done()');

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

