const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, execProposal, testStrategy, testProposal} = require("@overnight-contracts/common/utils/governance");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {StrategyThenaUsdcUsdt} = require("@overnight-contracts/strategies-bsc/deploy/07_strategy_thena_usdc_usdt");
const {StrategyThenaUsdtUsdc} = require("@overnight-contracts/strategies-bsc/deploy/usdt/10_strategy_thena_usdt_usdc");

async function main() {

    let thenaUsdPlus = await getContract('StrategyThenaUsdcUsdt', 'bsc');
    let thenaUsdtPlus = await getContract('StrategyThenaUsdtUsdc', 'bsc_usdt');

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(thenaUsdPlus.address);
    values.push(0);
    abis.push(thenaUsdPlus.interface.encodeFunctionData('upgradeTo', ['0x9A67f1d9544fE91852c832b931154E64E68Ec5A4']));

    addresses.push(thenaUsdPlus.address);
    values.push(0);
    abis.push(thenaUsdPlus.interface.encodeFunctionData('setParams', [await StrategyThenaUsdcUsdt()]));

    addresses.push(thenaUsdtPlus.address);
    values.push(0);
    abis.push(thenaUsdtPlus.interface.encodeFunctionData('upgradeTo', ['0xD6B74d3E9cE9E58D587AE88bac78eD25E4a86da9']));

    addresses.push(thenaUsdtPlus.address);
    values.push(0);
    abis.push(thenaUsdtPlus.interface.encodeFunctionData('setParams', [await StrategyThenaUsdtUsdc()]));

    await testProposal(addresses, values, abis);
    // await prepareEnvironment();
    await testStrategy(thenaUsdPlus);
    await testStrategy(thenaUsdtPlus);

    // await createProposal(addresses, values, abis)

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

