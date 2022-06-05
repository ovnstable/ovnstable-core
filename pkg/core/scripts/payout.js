const hre = require("hardhat");
const fs = require("fs");
const {getContract, getPrice, execTimelock, showM2M} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let exchange = await getContract('Exchange', 'polygon');

    await execTimelock(async (timelock)=>{

        await showM2M();
        await (await exchange.connect(timelock).setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60)).wait();
        let tx = await exchange.connect(timelock).payout(await getPrice());

        tx = await tx.wait();
        const payoutEvent = tx.events.find((e) => e.event == 'PayoutEvent').args;

        await showM2M();
    })

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

