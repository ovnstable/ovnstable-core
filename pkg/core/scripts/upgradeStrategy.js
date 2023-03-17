const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, execProposal, testStrategy, testProposal} = require("@overnight-contracts/common/utils/governance");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");

async function main() {

    let strategy = await getContract('StrategyUsdPlusDai', 'arbitrum_dai');

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(strategy.address);
    values.push(0);
    abis.push(strategy.interface.encodeFunctionData('upgradeTo', ['0xEbE7a13039Bb28E6135D9994aB4a28Dd0AA8D2f8']));

    let usdPlus = await getContract("UsdPlusToken", "arbitrum");
    let exchange = await getContract("Exchange", "arbitrum");

    let params = {

        usdc: ARBITRUM.usdc,
        dai: ARBITRUM.dai,
        usdPlus: usdPlus.address,
        exchange: exchange.address,
        oracleDai: ARBITRUM.oracleDai,
        oracleUsdc: ARBITRUM.oracleUsdc,
        gmxRouter: ARBITRUM.gmxRouter,
        zyberPool: ARBITRUM.zyber3Pool,
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        poolFee: 500, //0.05%
        gmxVault: ARBITRUM.gmxVault
    }

    addresses.push(strategy.address);
    values.push(0);
    abis.push(strategy.interface.encodeFunctionData('setParams', [params]));

    // await testProposal(addresses, values, abis);
    // await prepareEnvironment();
    // await testStrategy(strategy);

    await createProposal(addresses, values, abis)

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

