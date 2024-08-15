const {
    getContract,
    showM2M,
    execTimelock,
    getERC20ByAddress,
    initWallet
} = require("@overnight-contracts/common/utils/script-utils");
const {testProposal, createProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE18, toE6, toE18, fromE6, fromAsset} = require("@overnight-contracts/common/utils/decimals");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");
const {ethers} = require("hardhat");
const {StrategyKyberSwapUsdcDai} = require("../deploy/36_kyberswap_usdc_dai");
const {StrategyKyberSwapUsdcUsdt} = require("../deploy/35_kyberswap_usdc_usdt");

async function main() {

    let strategy = await getContract('StrategyKyberSwapUsdcUsdt', 'localhost');

    await execTimelock(async (timelock) => {

        console.log('NAV: ' + fromAsset(await strategy.netAssetValue()));
        console.log('LIQ: ' + fromAsset(await strategy.liquidationValue()));

        await strategy.connect(timelock).setParams(await StrategyKyberSwapUsdcUsdt());
        await strategy.connect(timelock).grantRole(Roles.PORTFOLIO_AGENT_ROLE, timelock.address);
        await strategy.connect(timelock).setPortfolioManager(timelock.address);
        await strategy.connect(timelock).unstake(ARBITRUM.usdc, "0", timelock.address, true);


        console.log('NAV: ' + fromAsset(await strategy.netAssetValue()));
        console.log('LIQ: ' + fromAsset(await strategy.liquidationValue()));

    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

