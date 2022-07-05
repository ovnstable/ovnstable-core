const { verify } = require("@overnight-contracts/common/utils/verify-utils");
const {getContract, initWallet, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {toUSDC, fromUSDC} = require("@overnight-contracts/common/utils/decimals");

async function main() {


    let exchanger = await getContract('HedgeExchangerUsdPlusWmatic', 'polygon_dev');

    await (await exchanger.payout()).wait();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
