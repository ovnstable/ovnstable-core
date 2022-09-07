const {getContract, getPrice, showHedgeM2M} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let exchanger = await getContract('HedgeExchanger' + process.env.ETS);

    while (true) {

        await showHedgeM2M();

        let opts = await getPrice();
        opts.gasLimit = "15000000"

        try {
            await exchanger.estimateGas.balance(opts);
        } catch (e) {
            console.log(e)
            await sleep(30000);
            continue;
        }

        try {
            await (await exchanger.balance(opts)).wait();
            break;
        } catch (e) {
            console.log(e)
            await sleep(30000);
            continue;
        }
    }

    await showHedgeM2M();

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

