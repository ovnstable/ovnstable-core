const {getContract, getPrice, showM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE6, fromE18, toE6, toE18} = require("@overnight-contracts/common/utils/decimals");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {BASE} = require("@overnight-contracts/common/utils/assets");
const {strategyBaseSwapDaiUsdbc} = require("../deploy/dai/02_strategy_baseswap_dai_usdbc");

async function main() {

    let baseSwap = await getContract('StrategyBaseSwapDaiUsdbc', 'base_dai');

    let addresses = [];
    let values = [];
    let abis = [];

    // await execTimelock(async (timelock)=>{
    //
    //     baseSwap = baseSwap.connect(timelock);
    //
    //     await baseSwap.setParams(await strategyBaseSwapDaiUsdbc());
    //     await baseSwap.grantRole(Roles.PORTFOLIO_AGENT_ROLE, timelock.address);
    //
    //     console.log('NAV: ' + fromE18(await baseSwap.netAssetValue()));
    //     await baseSwap.restakeToNewFarms();
    //     console.log('NAV: ' + fromE18(await baseSwap.netAssetValue()));
    //
    //     await baseSwap.setPortfolioManager(timelock.address);
    //     await baseSwap.unstake(BASE.dai, toE18(10_000), timelock.address, false)
    //     console.log('NAV: ' + fromE18(await baseSwap.netAssetValue()));
    //
    // })

    addresses.push(baseSwap.address);
    values.push(0);
    abis.push(baseSwap.interface.encodeFunctionData('upgradeTo', ['0xA00814B3AD626eBA2Ea2bC73B7341fF116781134']));

    addresses.push(baseSwap.address);
    values.push(0);
    abis.push(baseSwap.interface.encodeFunctionData('setParams', [await strategyBaseSwapDaiUsdbc()]));

    // await testProposal(addresses, values, abis);
    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

