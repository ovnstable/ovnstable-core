const {deployProxyMulti, deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        dai: ARBITRUM.dai,
        radpiePoolHelper: '0x4ade86667760f45cBd5255a5bc8B4c3a703dDA7a',
        radiantStaking: '0x18a192dFe0BE1E5E9AA424738FdAd800646283b2',
    }
}

module.exports.tags = ['StrategyRadpieDai'];
module.exports.strategyRadpieDaiParams = getParams;
