const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {ZKSYNC} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                usdc: ZKSYNC.usdc,
                nUsdc: ZKSYNC.nexonUsdc,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyNexon'];
