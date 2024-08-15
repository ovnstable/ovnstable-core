const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {ARBITRUM} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                eth: ARBITRUM.weth,
                aEth: ARBITRUM.aEth,
                aaveProvider: ARBITRUM.aaveProvider,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyAaveEth'];
