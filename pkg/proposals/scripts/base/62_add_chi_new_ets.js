const { getContract, transferETH } = require('@overnight-contracts/common/utils/script-utils');
const { createProposal, testProposal, testUsdPlus, testStrategy } = require('@overnight-contracts/common/utils/governance');

const { strategyEtsChiNewParams } = require('@overnight-contracts/strategies-base/deploy/07_ets_chi_new');

const path = require('path');
const { COMMON } = require('@overnight-contracts/common/utils/assets');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf('.js'));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let strategy = await getContract('StrategyEtsChiNew', 'base');
    let pm = await getContract('PortfolioManager', 'base');

    console.log('Strategy address: ', strategy.address);

    addProposalItem(pm, 'addStrategy', [strategy.address]);

    // await transferETH(10000000, "0xab918d486c61ADd7c577F1af938117bBD422f088")
    // await testProposal(addresses, values, abis);
    // await testUsdPlus(filename, 'base');

    await createProposal(filename, addresses, values, abis);

    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
