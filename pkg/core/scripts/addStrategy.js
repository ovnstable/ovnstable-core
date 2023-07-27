const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let pm = await getContract('PortfolioManager');
    let strategy = await getContract('StrategyEtsGamma');

    let price = await getPrice();
    await (await pm.addStrategy(strategy.address, price)).wait();
    console.log('Add strategy done');
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

