const hre = require("hardhat");
const fs = require("fs");
const {getContract, getPrice, execTimelock, showM2M, getCoreAsset} = require("@overnight-contracts/common/utils/script-utils");
const {fromE6} = require("@overnight-contracts/common/utils/decimals");

async function main() {

    let exchange = await getContract('Exchange');
    let opts = await getPrice();
    let pmIns = await getContract('PortfolioManager', 'polygon_ins');
    let pm = await getContract('PortfolioManager', 'polygon');

    await execTimelock(async (timelock)=>{
        await (await exchange.connect(timelock).setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60, opts)).wait();

        await (await exchange.setOracleLoss(100, 100000, opts)).wait(); // 0.1%
        console.log('exchange.setOracleLoss');

        await (await exchange.setCompensateLoss(10, 100000, opts)).wait(); // 0.01%
        console.log('exchange.setCompensateLoss');
    })



    let asset = await getCoreAsset();
    console.log('NAV ins: ' + fromE6(await asset.balanceOf(pmIns.address)));

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
            tx = await tx.wait();


            let event = tx.events.find((e)=>e.event === 'PayoutEvent');

            console.log('Profit:  ' + fromE6(await event.args[0].toString()));
            console.log('Premium: ' + fromE6(await event.args[3].toString()));
            console.log('NAV ins: ' + fromE6(await asset.balanceOf(pmIns.address)));
            console.log('Loss:    ' + fromE6(await event.args[4].toString()));
            console.log('TotalRiskFactor: ' + await pm.getTotalRiskFactor());

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

