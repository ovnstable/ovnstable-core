const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const path = require('path');

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let pm = await getContract('PortfolioManager', 'localhost');
    let strategy = await getContract('StrategyZerolendUsdt', 'localhost');
    let addresses = [];
    let values = [];
    let abis = [];

    console.log('Cash strategy', await pm.cashStrategy())
    console.log('PM', await strategy.portfolioManager())

    addProposal(pm.address, 0, pm.interface.encodeFunctionData('addStrategy', [strategy.address]));

    addProposal(pm.address, 0, pm.interface.encodeFunctionData('setCashStrategy', [strategy.address]));
    await testProposal(addresses, values, abis);
    await testUsdPlus(filename, "zksync_usdt");
    await testStrategy(filename, strategy, 'zksync');
    // await createProposal(filename, addresses, values, abis);

    function addProposal(address, value, abi) {
        addresses.push(address);
        values.push(value);
        abis.push(abi);
    }
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
