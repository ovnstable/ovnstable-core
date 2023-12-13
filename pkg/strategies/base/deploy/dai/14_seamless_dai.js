const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {OPTIMISM, BASE} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");


module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection('Seamless', async (strategy) => {
        await (await strategy.setParams(
            {
                dai: BASE.dai,
                usdbc: BASE.usdbc,
                sDai: BASE.sDai,
                provider: BASE.seamlessProvider,
                rewardsController: BASE.seamlessRewardsController,
                seam: BASE.seam,
                aerodromeRouter: BASE.aerodromeRouter,
                poolSeamUsdbc: '0x42e8dc1b1891c103291ec01d903451e729daaacc',
                poolUsdbcDai: '0x6EAB8c1B93f5799daDf2C687a30230a540DbD636'
            }
        )).wait();
    });

};

module.exports.tags = ['StrategySeamlessDai'];
