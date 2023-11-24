const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { ARBITRUM} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyWrapperDiamond', deployments, save, null);
    });

    await settingSection('SMM Theta', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        asset: ARBITRUM.dai,
        diamondStrategy: '0xf6eD265eaa71CAdA83fA833c9c87950954AB760A',
    };
}

module.exports.tags = ['StrategySmmTheta'];
module.exports.strategySmmTheta = getParams;
