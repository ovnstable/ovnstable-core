const hre = require("hardhat");
const fs = require("fs");
const {getContract, getPrice, execTimelock, showM2M} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let exchange = await getContract('InsuranceExchange');

    while (true) {
        await showM2M();
        try {
            let opts = await getPrice();

            try {
                await exchange.estimateGas.payout(opts);
            } catch (e) {
                console.log(e)
                await sleep(30000);
                continue;
            }

            let tx = await exchange.payout(opts);
            console.log(`tx.hash: ${tx.hash}`);
            await tx.wait();
            break
        } catch (e) {
            if (e.error !== undefined) {
                console.log(e.error)
            } else {
                console.log(e)
            }
            await sleep(30000);
        }
    }
    await showM2M();
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

