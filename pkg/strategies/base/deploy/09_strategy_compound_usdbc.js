const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BASE, COMMON} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection('', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        usdc: BASE.usdc,
        usdbc: BASE.usdbc,
        comp: BASE.comp,
        cUsdbc: BASE.compoundUsdbc,
        compoundRewards: BASE.compoundRewards,
        rewardWallet: COMMON.rewardWallet,
        inchSwapper: BASE.inchSwapper,
    }
}

module.exports.tags = ['StrategyCompoundUsdbc'];
module.exports.strategyCompoundUsdbcParams = getParams;
