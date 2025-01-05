const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { ARBITRUM, BASE } = require("@overnight-contracts/common/utils/assets");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");


module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategySper', deployments, save, null);
    });

    await settingSection('SperZetaArb', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        sper: '0x461b521E7343374e282484Ea617c30D4340091B4',
        asset: ARBITRUM.usdt
    };
}

module.exports.tags = ['StrategySperZeta'];
module.exports.getParams = getParams;
module.exports.strategySperZeta = getParams;
