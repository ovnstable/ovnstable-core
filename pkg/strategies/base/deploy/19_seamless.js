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
                usdbc: BASE.usdbc,
                sUsdbc: BASE.sUsdbc,
                provider: BASE.seamlessProvider,
                rewardsController: BASE.seamlessRewardsController,
                seam: BASE.seam,
                aerodromeRouter: BASE.aerodromeRouter,
                poolSeamUsdbc: '0x42e8dc1b1891c103291ec01d903451e729daaacc'
            }
        )).wait();
    });

};

module.exports.tags = ['StrategySeamless'];
