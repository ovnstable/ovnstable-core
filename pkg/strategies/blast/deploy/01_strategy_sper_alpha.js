const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { BLAST } = require("@overnight-contracts/common/utils/assets");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");


module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategySper', deployments, save, null);
    });

    await settingSection('SperAlphaBlast', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        sper: 'todo', // todo
        asset: BLAST.usdb,
    };
}

module.exports.tags = ['StrategySperAlpha'];
module.exports.getParams = getParams;
module.exports.strategySperAlpha = getParams;
