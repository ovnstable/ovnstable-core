const { verify } = require("@overnight-contracts/common/utils/verify-utils");
const {getContract, initWallet, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {toUSDC, fromUSDC} = require("@overnight-contracts/common/utils/decimals");
const {evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");

async function main() {


    let exchanger = await getContract('HedgeExchangerUsdPlusWmatic', 'polygon_dev');
    // await evmCheckpoint('test');
    try {
        let exchanger = await getContract('HedgeExchangerUsdPlusWmatic', 'polygon_dev');
        let rebase = await getContract('RebaseTokenUsdPlusWmatic', 'polygon_dev');
        let usdPlus = await getContract('UsdPlusToken');

        // await (await exchanger.setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60, await getPrice())).wait();

        let newVar = await getPrice();
        newVar.gasLimit = 15000000;
        console.log('Rebase: ' + await rebase.liquidityIndex());
        console.log('Rebase: ' + await rebase.balanceOf('0x5CB01385d3097b6a189d1ac8BA3364D900666445'));
        console.log('Usd+ balance: ' + await usdPlus.balanceOf('0xEb7f1622980bfF682635E35076bd3115814254A7'));

        let tx = await (await exchanger.payout(newVar)).wait();

        // await (await exchanger.setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60, await getPrice())).wait();
        // await (await exchanger.payout(await getPrice())).wait();
        const args = tx.events.find((e) => e.event == 'PayoutEvent').args;


        console.log('tvlFee: ' + args.tvlFee.toString());
        console.log('profitFee: ' + args.profitFee.toString());
        console.log('profit: ' + args.profit.toString());
        console.log('loss: ' + args.loss.toString());
        // console.log('rewards: ' + tx.events.find((e) => e.event == 'Reward').args.amount.toString());

        console.log('Rebase: ' + await rebase.balanceOf('0x5CB01385d3097b6a189d1ac8BA3364D900666445'));
        console.log('Rebase: ' + await rebase.liquidityIndex());
        console.log('Usd+ balance: ' + await usdPlus.balanceOf('0xEb7f1622980bfF682635E35076bd3115814254A7'));
    } catch (e) {
        console.log(e)
    }

    // await evmRestore('test');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

