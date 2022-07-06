const { verify } = require("@overnight-contracts/common/utils/verify-utils");
const {getContract, initWallet, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {toUSDC, fromUSDC} = require("@overnight-contracts/common/utils/decimals");
const {evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");

async function main() {


    let exchanger = await getContract('HedgeExchangerUsdPlusWmatic', 'polygon_dev');

    await (await exchanger.setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60, await getPrice())).wait();
    await (await exchanger.payout(await getPrice())).wait();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
