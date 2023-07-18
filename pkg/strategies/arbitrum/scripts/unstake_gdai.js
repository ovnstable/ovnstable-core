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

async function main() {

    let strategy = await getContract('StrategyPendleDaiGDai', 'localhost');

    let dai = await getERC20ByAddress(ARBITRUM.dai);

    await execTimelock(async (timelock) => {

        console.log('NAV: ' + fromAsset(await strategy.netAssetValue()));
        console.log('LIQ: ' + fromAsset(await strategy.liquidationValue()));
        console.log('DAI: ' + fromAsset(await dai.balanceOf(timelock.address)));

        await strategy.connect(timelock).grantRole(Roles.PORTFOLIO_AGENT_ROLE, timelock.address);
        await strategy.connect(timelock).setPortfolioManager(timelock.address);
        await strategy.connect(timelock).unstakeToGDaiAndMakeRequest(0, true);

        let delay = 4 * 24 * 60 * 60 * 1000;

        await ethers.provider.send("evm_increaseTime", [delay]);
        await ethers.provider.send('evm_mine');

        await strategy.newOpenPnlRequestOrEpoch();

        await strategy.connect(timelock).unstake(ARBITRUM.dai, 0, timelock.address, true);

        console.log('NAV: ' + fromAsset(await strategy.netAssetValue()));
        console.log('LIQ: ' + fromAsset(await strategy.liquidationValue()));
        console.log('DAI: ' + fromAsset(await dai.balanceOf(timelock.address)));

    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

