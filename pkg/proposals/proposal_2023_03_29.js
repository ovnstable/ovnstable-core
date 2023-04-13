const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
let {OPTIMISM} = require('@overnight-contracts/common/utils/assets');
const {Roles} = require("@overnight-contracts/common/utils/roles");

let arrakisRouter = "0x9ce88a56d120300061593eF7AD074A1B710094d5";
let arrakisRewards = "0x87c7c885365700D157cd0f39a7803320fe86f0f5";
let arrakisVault = "0x632336474f5Bf11aEbECd63B84A0a2800B99a490";
let poolUsdcOpFee = 500; // 0.05%

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let StrategyArrakisUsdcDai = await getContract('StrategyArrakisUsdcDai');

    let StrategyArrakisUsdcDaiParams = {
        usdc: OPTIMISM.usdc,
        dai: OPTIMISM.dai,
        op: OPTIMISM.op,
        arrakisRouter: arrakisRouter,
        arrakisRewards: arrakisRewards,
        arrakisVault: arrakisVault,
        uniswapV3Router: OPTIMISM.uniswapV3Router,
        poolUsdcOpFee: poolUsdcOpFee,
        oracleUsdc: OPTIMISM.oracleUsdc,
        oracleDai: OPTIMISM.oracleDai,
        curve3Pool: OPTIMISM.curve3Pool,
    };

    addresses.push(StrategyArrakisUsdcDai.address);
    values.push(0);
    abis.push(StrategyArrakisUsdcDai.interface.encodeFunctionData('upgradeTo', ['0x77aF00B971F06671C8fEaC070Df6205cBb43BA97']));

    addresses.push(StrategyArrakisUsdcDai.address);
    values.push(0);
    abis.push(StrategyArrakisUsdcDai.interface.encodeFunctionData('setParams', [StrategyArrakisUsdcDaiParams]));


    let PortfolioManager = await getContract('PortfolioManager');

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', ['0x33227153345C71DC3552AF7Cba3AF07C7b7B762b']));

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', ['0x832f18e921375d9Dc60ED0239698ccbb0f274248']));

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', ['0x9d9DF2740627F422D8b33aFD0CCaeb6407c64aE6']));


    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

