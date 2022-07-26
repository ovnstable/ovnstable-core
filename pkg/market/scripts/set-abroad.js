const { verify } = require("@overnight-contracts/common/utils/verify-utils");
const {getContract, initWallet, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {toE6, fromE6} = require("@overnight-contracts/common/utils/decimals");
const {fromE18} = require("../../common/utils/decimals");

async function main() {

    let contract = await getContract('HedgeExchangerUsdPlusWmatic');
    await (await contract.setAbroad(1000400,await getPrice())).wait();

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
