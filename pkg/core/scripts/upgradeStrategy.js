const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, execProposal, testStrategy, testProposal} = require("@overnight-contracts/common/utils/governance");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {StrategyThenaUsdcUsdt} = require("@overnight-contracts/strategies-bsc/deploy/07_strategy_thena_usdc_usdt");
const {StrategyThenaUsdtUsdc} = require("@overnight-contracts/strategies-bsc/deploy/usdt/10_strategy_thena_usdt_usdc");

async function main() {

    let equilibria = await getContract('StrategyEquilibriaUsdcUsdt', 'arbitrum');
    let pendle = await getContract('StrategyPendleUsdcUsdt', 'arbitrum');

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(equilibria.address);
    values.push(0);
    abis.push(equilibria.interface.encodeFunctionData('upgradeTo', ['0xB9dEC7113547A5ebEd26054b46F38743b5116b65']));

    addresses.push(pendle.address);
    values.push(0);
    abis.push(pendle.interface.encodeFunctionData('upgradeTo', ['0xeBAaa17fc81d2bfeFc1559B547b999FceAC7af56']));

    // await testProposal(addresses, values, abis);
    await createProposal(addresses, values, abis)

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

