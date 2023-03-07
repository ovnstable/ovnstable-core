const hre = require("hardhat");
const fs = require("fs");
const {getContract, getPrice, execTimelock, showM2M, getCoreAsset} = require("@overnight-contracts/common/utils/script-utils");
const {fromE6} = require("@overnight-contracts/common/utils/decimals");
const HedgeExchanger = require("@overnight-contracts/common/utils/abi/HedgeExchanger.json");

async function main() {

    await execTimelock(async (timelock) => {
    let exchange = await getContract('Exchange');
//    await (await exchange.setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60)).wait();

    let opts = await getPrice();

    if (process.env.ETH_NETWORK === 'ARBITRUM') {
        let hedgeExchangerAlpha = await ethers.getContractAt(HedgeExchanger, "0x21b3D1A8B09374a890E3Eb8139E60B21D01490Da");
        let hedgeExchangerBeta = await ethers.getContractAt(HedgeExchanger, "0x92FC104f8b42c7dCe5Be9BE29Bfb82d2f9D96855");
        let hedgeExchangerGamma = await ethers.getContractAt(HedgeExchanger, "0xc2c84ca763572c6aF596B703Df9232b4313AD4e3");

        await (await exchange.connect(timelock).setBlockGetter("0x0000000000000000000000000000000000000000", opts)).wait();
        console.log("Set exchange blockGetter to 0x");
        await (await hedgeExchangerAlpha.connect(timelock).setBlockGetter("0x0000000000000000000000000000000000000000", opts)).wait();
        console.log("Set hedgeExchangerAlpha blockGetter to 0x");
        await (await hedgeExchangerBeta.connect(timelock).setBlockGetter("0x0000000000000000000000000000000000000000", opts)).wait();
        console.log("Set hedgeExchangerBeta blockGetter to 0x");
        await (await hedgeExchangerGamma.connect(timelock).setBlockGetter("0x0000000000000000000000000000000000000000", opts)).wait();
        console.log("Set hedgeExchangerGamma blockGetter to 0x");
    }

    while (true) {
        await showM2M();
        try {
            opts = await getPrice();

            try {
                await exchange.estimateGas.payout(opts);
            } catch (e) {
                console.log(e)
                await sleep(30000);
                continue;
            }

            let tx = await exchange.payout(opts);
            console.log(`tx.hash: ${tx.hash}`);
            tx = await tx.wait();


            let event = tx.events.find((e)=>e.event === 'PayoutEvent');

            if (process.env.ETH_NETWORK === 'POLYGON') {
                console.log('Profit:       ' + fromE6(await event.args[0].toString()));
                console.log('ExcessProfit: ' + fromE6(await event.args[2].toString()));
                console.log('Premium:      ' + fromE6(await event.args[3].toString()));
                console.log('Loss:         ' + fromE6(await event.args[4].toString()));
            } else {
                console.log('Profit:       ' + fromE6(await event.args[0].toString()));
                console.log('InsuranceFee: ' + fromE6(await event.args[2].toString()));
            }

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

    });

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

