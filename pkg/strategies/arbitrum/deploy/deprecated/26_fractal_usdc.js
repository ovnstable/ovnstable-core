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
        usdc: ARBITRUM.usdc,
        subAccount: '0xcb0c14adb2a10ab24d3334f09dbdf612ab0c2f4d',
    }
}

module.exports.tags = ['StrategyFractalUsdc'];
module.exports.getParams = getParams;
module.exports.strategyFractalDaiParams = getParams;
