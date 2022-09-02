const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let contract = await getContract('HedgeExchanger' + process.env.ETS);
    await (await contract.setAbroad(1000001, 1001950)).wait();

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
