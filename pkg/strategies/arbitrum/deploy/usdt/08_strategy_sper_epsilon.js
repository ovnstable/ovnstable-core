const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { ARBITRUM, BASE } = require("@overnight-contracts/common/utils/assets");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");


module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategySper', deployments, save, null);
    });

    await settingSection('SperEpsilonArb', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        sper: '0x701494b77959b0399F2112db1B423C8f5f8f847C',
        asset: ARBITRUM.usdt
    };
}

module.exports.tags = ['StrategySperEpsilon'];
module.exports.getParams = getParams;
module.exports.strategySperEpsilon = getParams;
