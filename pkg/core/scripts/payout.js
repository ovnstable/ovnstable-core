const hre = require("hardhat");
const fs = require("fs");
const {
    getContract,
    getPrice,
    execTimelock,
    showM2M,
    getCoreAsset
} = require("@overnight-contracts/common/utils/script-utils");
const {fromE6} = require("@overnight-contracts/common/utils/decimals");
const {COMMON} = require("@overnight-contracts/common/utils/assets");

async function main() {

    let exchange = await getContract('Exchange');
//    await (await exchange.setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60)).wait();

    let usdPlus = await getContract('UsdPlusToken');

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

            console.log("USD+: " + fromE6(await usdPlus.balanceOf(COMMON.rewardWallet)));
            let tx = await exchange.payout(opts);
            // let tx = await exchange.payout();
            console.log(`tx.hash: ${tx.hash}`);
            tx = await tx.wait();
            console.log("USD+: " + fromE6(await usdPlus.balanceOf(COMMON.rewardWallet)));

            let event = tx.events.find((e) => e.event === 'PayoutEvent');

            console.log('Profit:       ' + fromE6(await event.args[0].toString()));
            console.log('ExcessProfit: ' + fromE6(await event.args[2].toString()));
            console.log('Premium:      ' + fromE6(await event.args[3].toString()));
            console.log('Loss:         ' + fromE6(await event.args[4].toString()));

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

