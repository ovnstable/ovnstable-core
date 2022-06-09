const {getContract} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let pm = await getContract('PortfolioManager');
    await (await pm.balance()).wait();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

