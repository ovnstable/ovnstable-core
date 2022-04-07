const hre = require("hardhat");
const fs = require("fs");
const ethers = hre.ethers;

let EX = JSON.parse(fs.readFileSync('./deployments/polygon/Exchange.json'));

async function main() {

    let exchangeNew = await ethers.getContractAt(EX.abi, EX.address);

    let exchangeOld = await ethers.getContractAt(EX.abi, "0x2B3261416c4781E6787F643794D396C5DEa1F4cC");

    console.log('Exchange old: ' + exchangeOld.address);
    console.log('Exchange new : ' + exchangeNew.address);

    let nextPayoutTimeOld = await exchangeOld.nextPayoutTime();
    let payoutPeriodOld = await exchangeOld.payoutPeriod();
    let payoutTimeRangeOld = await exchangeOld.payoutTimeRange();
    console.log('Time old: ' + new Date(nextPayoutTimeOld * 1000));
    console.log('Period old: ' + payoutPeriodOld);
    console.log('Range old: ' + payoutTimeRangeOld);

    let nextPayoutTimeNew = await exchangeNew.nextPayoutTime();
    let payoutPeriodNew = await exchangeOld.payoutPeriod();
    let payoutTimeRangeNew = await exchangeOld.payoutTimeRange();
    console.log('Time new: ' + new Date(nextPayoutTimeNew* 1000));
    console.log('Period new: ' + payoutPeriodNew);
    console.log('Range new: ' + payoutTimeRangeNew);


    let tx = await exchangeNew.setPayoutTimes(nextPayoutTimeOld, payoutPeriodOld, payoutTimeRangeOld);
    await tx.wait();

    nextPayoutTimeOld = await exchangeOld.nextPayoutTime();
    payoutPeriodOld = await exchangeOld.payoutPeriod();
    payoutTimeRangeOld = await exchangeOld.payoutTimeRange();
    console.log('Time old: ' + new Date(nextPayoutTimeOld * 1000));
    console.log('Period old: ' + payoutPeriodOld);
    console.log('Range old: ' + payoutTimeRangeOld);

    nextPayoutTimeNew = await exchangeNew.nextPayoutTime();
    payoutPeriodNew = await exchangeOld.payoutPeriod();
    payoutTimeRangeNew = await exchangeOld.payoutTimeRange();
    console.log('Time new: ' + new Date(nextPayoutTimeNew* 1000));
    console.log('Period new: ' + payoutPeriodNew);
    console.log('Range new: ' + payoutTimeRangeNew);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });




