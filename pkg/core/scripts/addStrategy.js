const {getContract, getPrice, showM2M, convertWeights} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {Wallets} = require("@overnight-contracts/common/utils/wallets");

async function main() {

    // await showM2M();

    let pm = await getContract('PortfolioManager', 'zksync');
    let strategy = await getContract('StrategyZerolend', 'localhost');

    await (await pm.addStrategy(strategy.address, {gasPrice: 100_000_000, gasLimit: 50_000_000})).wait();
    console.log("Strategy added");
    
    await (await pm.setCashStrategy(strategy.address, await getPrice())).wait();
    console.log("Cash strategy set");


    // await showM2M();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

