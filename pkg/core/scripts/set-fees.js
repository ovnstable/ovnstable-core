const {getContract} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let exchange = await getContract('Exchange');

    await (await exchange.setBuyFee(50, 100000)).wait();
    await (await exchange.setRedeemFee(50, 100000)).wait();

    console.log('SetFees done()')

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
