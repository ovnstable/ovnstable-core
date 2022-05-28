const hre = require("hardhat");
const fs = require("fs");
const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let exchange = await getContract('Exchange', 'polygon');

    await (await exchange.payout(await getPrice())).wait();

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

