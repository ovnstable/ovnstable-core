const hre = require("hardhat");
const {getContract, showM2M, execTimelock, getERC20, initWallet, grantRoleInRoleManager} = require("@overnight-contracts/common/utils/script-utils");
const {
    createProposal,
    testProposal,
    testUsdPlus,
    testStrategy
} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {strategySiloUsdc} = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const {ethers} = require("hardhat");
const {strategyEtsEtaParams} = require("@overnight-contracts/strategies-base/deploy/11_ets_eta");
const {strategyAlienBaseDaiUsdbcParams} = require("@overnight-contracts/strategies-base/deploy/dai/09_strategy_alienbase_dai_usdbc");
const {COMMON, BASE} = require("@overnight-contracts/common/utils/assets");
const {fromE6, toE18} = require("@overnight-contracts/common/utils/decimals");
const {inchSwapperUpdatePath} = require("@overnight-contracts/common/utils/inch-helpers");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let moonwell = await getContract('StrategyMoonwellDai', 'base_dai');
    let alienBase = await getContract('StrategyAlienBaseDaiUsdbc', 'base_dai');

    let pm = await getContract('PortfolioManager', 'base_dai');
    let roleManager = await getContract('RoleManager', 'base');


    addresses.push(moonwell.address);
    values.push(0);
    abis.push(moonwell.interface.encodeFunctionData('upgradeTo', ['0xeb38DF3B6C9C9881278Ec3D2dD0a050175C7b4c0']));

    addresses.push(moonwell.address);
    values.push(0);
    abis.push(moonwell.interface.encodeFunctionData('setStrategyParams', [pm.address, roleManager.address]));

    addresses.push(alienBase.address);
    values.push(0);
    abis.push(alienBase.interface.encodeFunctionData('upgradeTo', ['0xE16c3891D2d28179516Eba6AC653cA82763B4EAd']));

    addresses.push(alienBase.address);
    values.push(0);
    abis.push(alienBase.interface.encodeFunctionData('setStrategyParams', [pm.address, roleManager.address]));

    addresses.push(alienBase.address);
    values.push(0);
    abis.push(alienBase.interface.encodeFunctionData('setParams', [await strategyAlienBaseDaiUsdbcParams()]));




    // await showM2M();
    // await testProposal(addresses, values, abis);
    // await showM2M();
    //
    // await grantRoleInRoleManager(Roles.PORTFOLIO_AGENT_ROLE);
    // await alienBase.setSlippages(20, 10, 10);
    //
    // let usdc = await getERC20('usdc', await initWallet())
    //
    // console.log(`USDC treasure: ${fromE6(await usdc.balanceOf(COMMON.rewardWallet))}`);
    // await testStrategy(filename, moonwell, 'base_dai');
    // console.log(`USDC treasure: ${fromE6(await usdc.balanceOf(COMMON.rewardWallet))}`);
    //
    // await inchSwapperUpdatePath(BASE.usdbc, BASE.dai, toE18(10_000_000), 'base');
    //
    // await testStrategy(filename, alienBase, 'base_dai');

    await createProposal(filename, addresses, values, abis);

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

