const {getContract, getPrice, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let PortfolioManager = await getContract('PortfolioManager', 'linea');
    let PortfolioManagerUsdt = await getContract('PortfolioManager', 'linea_usdt');
    let StrategyMendiUsdc = await getContract('StrategyMendiUsdc', 'linea');
    let StrategyMendiUsdt = await getContract('StrategyMendiUsdt', 'linea_usdt');

    let price = await getPrice();
    await (await PortfolioManager.addStrategy(StrategyMendiUsdc.address, price)).wait();
    await (await PortfolioManagerUsdt.addStrategy(StrategyMendiUsdt.address, price)).wait();

    console.log("Strategies added");
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

