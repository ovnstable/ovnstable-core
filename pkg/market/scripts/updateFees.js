const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let contract = await getContract('HedgeExchangerUsdPlusWbnb');

    let params = await getPrice();
    await (await contract.setBuyFee(5, 100000, params)).wait();
    await (await contract.setRedeemFee(0, 100000, params)).wait();
    await (await contract.setTvlFee(1500, 100000, params)).wait();
    await (await contract.setProfitFee(20000, 100000, params)).wait();

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
