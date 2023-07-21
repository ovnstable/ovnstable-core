const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, execProposal, testStrategy, testProposal} = require("@overnight-contracts/common/utils/governance");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {StrategyThenaUsdcUsdt} = require("@overnight-contracts/strategies-bsc/deploy/07_strategy_thena_usdc_usdt");
const {StrategyThenaUsdtUsdc} = require("@overnight-contracts/strategies-bsc/deploy/usdt/10_strategy_thena_usdt_usdc");

async function main() {

    let strategy = await getContract('StrategyEquilibriaDaiGDai', 'arbitrum_dai');

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(strategy.address);
    values.push(0);
    abis.push(strategy.interface.encodeFunctionData('upgradeTo', ['0x17cAeEb820f6763C7e98F026E5B5a91E448c94d6']));

    await createProposal(addresses, values, abis)

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

