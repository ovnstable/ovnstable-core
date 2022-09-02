const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let contract = await getContract('HedgeExchangerBusdWbnb');
    await (await contract.setAbroad(1000400, 1001950)).wait();

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
