const {getContract, getERC20, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");
const {strategyVelocoreUsdcUsdPlus} = require("../deploy/02_strategy_velocore_usdc_usdp");
const {toE6, fromE6} = require("@overnight-contracts/common/utils/decimals");
const {Roles} = require("@overnight-contracts/common/utils/roles");

async function main() {

    let strategy = await getContract('StrategyEtsBeta');

    console.log('NAV: ' + await strategy.netAssetValue());
    console.log('Rebase: ' + await strategy.rebaseToken());
    console.log('Exchange: ' + await strategy.hedgeExchanger());
    console.log('asset: ' + await strategy.asset());
    console.log('pm: ' + await strategy.portfolioManager());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

