const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {

        // await (await strategy.setParams(aaveAddress, assets.usdc, assets.amUsdc)).wait();
    });
};

module.exports.tags = ['StrategyQsMaiUsdt'];
