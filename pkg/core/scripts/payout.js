const hre = require("hardhat");
const fs = require("fs");
const {
    getContract,
    getPrice,
    execTimelock,
    showM2M,
    getCoreAsset, showRewardsFromPayout, transferAsset
} = require("@overnight-contracts/common/utils/script-utils");
const {fromE6, fromAsset, toE6} = require("@overnight-contracts/common/utils/decimals");
const {COMMON, ARBITRUM} = require("@overnight-contracts/common/utils/assets");
const { setSwapData } = require("../scripts/odos-helper");

async function main() {

    let exchange = await getContract('Exchange', 'localhost');
    let exToken = await ethers.getContractAt("IERC20", await exchange.usdc());
    let ovn = await getContract('Ovn');
    let pm = await getContract('PortfolioManager');
    let insurance = await ethers.getContract("InsuranceExchange");
    await (await exchange.setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60)).wait();

    let usdPlus = await getContract('UsdPlusToken');
    let zeroAddress = "0x0000000000000000000000000000000000000000";
    let odosEmptyData = {
        inputTokenAddress: zeroAddress,
        outputTokenAddress: zeroAddress,
        amountIn: 0,
        data: ""
    }


    while (true) {
        await showM2M();
        let swapInfo;
        let odosSwapData = odosEmptyData;
        try {
            let opts = await getPrice();

            // 1. simulate payout, get loss or premium
            // 2.1. if premium generates data to swap usdc to ovn
            // 2.2. if compensate calculate needed ovn and generate data to swap ovn to usdc
            // 3. estimateGas payout
            // 4. make real payout

            try {
                swapInfo = await exchange.callStatic.payout(true, odosEmptyData, opts);
                console.log("swapInfo", swapInfo);
            } catch (e) {
                console.log(e)
                await sleep(30000);
                continue;
            }

            // 2.1. if premium generates data to swap usdc to ovn
            if (swapInfo.swapAmount > 0) {
                odosSwapData = await getOdosSwapData(exToken.address, ovn.address, swapInfo.swapAmount);
            
            // 2.2. if compensate calculate needed ovn and generate data to swap ovn to usdc
            if (swapInfo.swapAmount < 0) {
                let amountOut = await getOdosAmountOut(exToken.address, ovn.address, -swapInfo.swapAmount);
                // +5% slippage
                amountOut = amountOut;
                odosSwapData = await getOdosSwapData(ovn.address, exToken.address, amountOut);
            }

            // 3. estimateGas payout
            try {
                await exchange.estimateGas.payout(false, odosSwapData, opts);
            } catch (e) {
                console.log(e)
                await sleep(30000);
                continue;
            }

            // 4. make real payout
            console.log("USD+: " + fromE6(await usdPlus.balanceOf(COMMON.rewardWallet)));
            let tx = await exchange.payout(false, odosSwapData, opts);
            // let tx = await exchange.payout();
            console.log(`tx.hash: ${tx.hash}`);
            tx = await tx.wait();

            console.log("USD+: " + fromE6(await usdPlus.balanceOf(COMMON.rewardWallet)));

            let event = tx.events.find((e) => e.event === 'PayoutEvent');


            console.log('Profit:       ' + fromE6(await event.args[0].toString()));
            console.log('ExcessProfit: ' + fromE6(await event.args[2].toString()));
            console.log('Premium:      ' + fromE6(await event.args[3].toString()));
            console.log('Loss:         ' + fromE6(await event.args[4].toString()));

            await showRewardsFromPayout(tx);

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

