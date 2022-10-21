const hre = require("hardhat");
const fs = require("fs");
const {getContract, getPrice, execTimelock, showM2M} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let exchange = await getContract('Exchange', 'localhost');
    //
    // await execTimelock(async (timelock)=>{
    //
    //     await showM2M();
    //
    //     await (await exchange.connect(timelock).setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60)).wait();
    //
    //     try {
    //         let tx = await exchange.connect(timelock).payout(await getPrice());
    //         await tx.wait();
    //     } catch (e) {
    //         console.log(e.message);
    //     }
    //
    //     let tx = await exchange.payout(await getPrice());
    //     await tx.wait();
    //
    //     await showM2M();
    // })


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
            // let tx = await exchange.payout();
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

