const {getContract, getERC20, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");
const {strategyVelocoreUsdcUsdPlus} = require("../deploy/02_strategy_velocore_usdc_usdp");
const {toE6, fromE6} = require("@overnight-contracts/common/utils/decimals");
const {Roles} = require("@overnight-contracts/common/utils/roles");

async function main() {

    let exchange = await getContract('Exchange');
    let usdPlus = await getContract('UsdPlusToken');
    let m2m = await getContract('Mark2Market');

    console.log('NAV:   ' + fromE6(await m2m.totalNetAssets()));
    console.log('Total: ' + fromE6(await usdPlus.totalSupply()));
    console.log('Index: ' + await usdPlus.liquidityIndex());

    let strategy = await getContract('StrategyVelocoreUsdcUsdPlus');

    await (await exchange.grantRole(Roles.FREE_RIDER_ROLE, strategy.address)).wait();
    await (await exchange.grantRole(Roles.WHITELIST_ROLE, strategy.address)).wait();
    console.log('Grant role done()');
    await (await strategy.moveToCash()).wait();
    console.log('Move to cash done()');

    console.log('NAV:   ' + fromE6(await m2m.totalNetAssets()));
    console.log('Total: ' + fromE6(await usdPlus.totalSupply()));
    console.log('Index: ' + await usdPlus.liquidityIndex());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

