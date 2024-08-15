const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;


    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {

        await (await strategy.setTokens(POLYGON.usdc, '0x1a13f4ca1d028320a707d99520abfefca3998b7f')).wait();
        await (await strategy.setParams('0xd05e3e715d945b59290df0ae8ef85c1bdb684744')).wait();
    });
};

module.exports.tags = ['StrategyAaveV2'];
