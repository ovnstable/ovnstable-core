const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, execProposal, testStrategy, testProposal} = require("@overnight-contracts/common/utils/governance");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {StrategyThenaUsdcUsdt} = require("@overnight-contracts/strategies-bsc/deploy/07_strategy_thena_usdc_usdt");
const {StrategyThenaUsdtUsdc} = require("@overnight-contracts/strategies-bsc/deploy/usdt/10_strategy_thena_usdt_usdc");

async function main() {

    let daiStrategy = await getContract('StrategyKyberSwapUsdcDai', 'optimism');
    let usdtStrategy = await getContract('StrategyKyberSwapUsdcUsdt', 'optimism');

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(daiStrategy.address);
    values.push(0);
    abis.push(daiStrategy.interface.encodeFunctionData('upgradeTo', ['0x44bb1f5eEa87cD910505EEa6aD7EaC6E14EeE1bB']));

    addresses.push(usdtStrategy.address);
    values.push(0);
    abis.push(usdtStrategy.interface.encodeFunctionData('upgradeTo', ['0xb21350049EEeF54Ffb1bcaf8C7848acC631e6D6f']));

    // await testProposal(addresses, values, abis);
    await createProposal(addresses, values, abis)

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

