const {
    getContract,
    showM2M,
    showRewardsFromPayout
} = require("@overnight-contracts/common/utils/script-utils");
const {fromE6, fromAsset, fromUsdPlus} = require("@overnight-contracts/common/utils/decimals");
const {COMMON} = require("@overnight-contracts/common/utils/assets");
const {ethers} = require("hardhat");
const {getOdosSwapData, getOdosAmountOut} = require("@overnight-contracts/common/utils/odos-helper");

let zeroAddress = "0x0000000000000000000000000000000000000000";
let odosEmptyData = {
    inputTokenAddress: zeroAddress,
    outputTokenAddress: zeroAddress,
    amountIn: 0,
    data: ""
}

async function main() {

    let exchange = await getContract('Exchange');
    // await (await exchange.setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60)).wait();
    let isInsurance = await isEnableInsurance();

    while (true) {
        await showM2M();
        try {

            try {
                if (isInsurance) {
                    await exchange.estimateGas.payout(false, await getOdosParams());
                } else {
                    await exchange.estimateGas.payout();
                }
            } catch (e) {
                console.log(e)
                await sleep(30000);
                continue;
            }

            // 4. make real payout
            let tx;
            if (isInsurance) {

                tx = await exchange.payout(false, await getOdosParams());
            } else {
                tx = await exchange.payout();
            }

            await showPayoutData(tx);

        } catch (e) {
            console.log(e)
            await sleep(30000);
        }
    }


}

async function isEnableInsurance() {

    try {
        await getContract('InsuranceExchange');
        return true;
    } catch (e) {
        return false;
    }

}

async function getOdosParams(exchange) {

    // 1. simulate payout, get loss or premium
    // 2.1. if premium generates data to swap usdc to ovn
    // 2.2. if compensate calculate needed ovn and generate data to swap ovn to usdc
    // 3. estimateGas payout
    // 4. make real payout


    // 1. simulate payout, get loss or premium
    // This block of code is needed in order to find out in advance what amount of compensation or premium will be during the payout.
    // This information is needed to receive a route from Odos since Odos cannot generate data with dynamic substitution of volumes.
    let exToken = await ethers.getContractAt("IERC20", await exchange.usdc());
    let ovn = await getContract('Ovn');
    let insurance = await ethers.getContract("InsuranceExchange");
    let odosSwapData = odosEmptyData;

    let swapInfo = await exchange.callStatic.payout(true, odosEmptyData);
    console.log("swapInfo", swapInfo);
    // 2.1. if premium then generates data to swap usdc to ovn
    if (swapInfo.swapAmount > 0) {
        let currentTokenAmount = await exToken.balanceOf(insurance.address);
        let neededAmount = swapInfo.swapAmount + currentTokenAmount;
        // -5% slippage
        neededAmount = neededAmount.mul(95).div(100);
        odosSwapData = await getOdosSwapData(exToken.address, ovn.address, neededAmount);

        // 2.2. if compensate then calculate needed ovn and generate data to swap ovn to usdc
        if (swapInfo.swapAmount < 0) {
            let currentTokenAmount = await exToken.balanceOf(insurance.address);
            let outDecimals = await ovn.decimals();
            let neededAmount = await getOdosAmountOut(exToken.address, ovn.address, -swapInfo.swapAmount, outDecimals);
            neededAmount = neededAmount - currentTokenAmount;
            // +5% slippage
            neededAmount = neededAmount.mul(105).div(100);
            odosSwapData = await getOdosSwapData(ovn.address, exToken.address, neededAmount);
        }
    }

    return odosSwapData;

}

async function showPayoutData(tx) {

    let usdPlus = await getContract('UsdPlusToken');

    console.log(`tx.hash: ${tx.hash}`);
    tx = await tx.wait();


    console.log("USD+: " + fromUsdPlus(await usdPlus.balanceOf(COMMON.rewardWallet)));

    let event = tx.events.find((e) => e.event === 'PayoutEvent');

    console.log('Profit:       ' + fromUsdPlus(await event.args[0].toString()));
    console.log('ExcessProfit: ' + fromUsdPlus(await event.args[2].toString()));
    console.log('Premium:      ' + fromUsdPlus(await event.args[3].toString()));
    console.log('Loss:         ' + fromUsdPlus(await event.args[4].toString()));

    await showRewardsFromPayout(tx);

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

