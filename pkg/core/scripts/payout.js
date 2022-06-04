const hre = require("hardhat");
const fs = require("fs");
const {getContract, getPrice, execTimelock, showM2M} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let exchange = await getContract('Exchange', 'polygon');
    let m2m = await getContract('Mark2Market', 'polygon');
    let usdPlus = await getContract('UsdPlusToken', 'polygon');

    await execTimelock(async (timelock)=>{

        await showM2M(m2m, usdPlus);
        await (await exchange.connect(timelock).setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60)).wait();
        await (await exchange.connect(timelock).payout(await getPrice())).wait();
        await showM2M(m2m, usdPlus);
    })

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

