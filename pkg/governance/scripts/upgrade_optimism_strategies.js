const {getContract, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, execProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let usdPlus = '0x73cb180bf0521828d8849bc8CF2B920918e23032';
    let exchange = '0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65';
    let poolUsdcDaiFee = 100; // 0.01%
    let StrategyUsdPlusDaiParams = {
        daiToken: OPTIMISM.dai,
        usdcToken: OPTIMISM.usdc,
        usdPlus: usdPlus,
        exchange: exchange,
        oracleUsdc: OPTIMISM.oracleUsdc,
        oracleDai: OPTIMISM.oracleDai,
        uniswapV3Router: OPTIMISM.uniswapV3Router,
        poolUsdcDaiFee: poolUsdcDaiFee,
        curve3Pool: OPTIMISM.curve3Pool,
    };

    let StrategyUsdPlusDai = await getContract('StrategyUsdPlusDai' );

    addresses.push(StrategyUsdPlusDai.address);
    values.push(0);
    abis.push(StrategyUsdPlusDai.interface.encodeFunctionData('upgradeTo', ['0x52fA472b1ceCD98CDAbE02181Fad811e4F9b675f']));

    addresses.push(StrategyUsdPlusDai.address);
    values.push(0);
    abis.push(StrategyUsdPlusDai.interface.encodeFunctionData('setParams', [StrategyUsdPlusDaiParams]));


    // await showM2M();
    // await testProposal(addresses, values, abis);
    // await testUsdPlus();
    // await testStrategy(StrategyUsdPlusDai);
    // await showM2M();

    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

