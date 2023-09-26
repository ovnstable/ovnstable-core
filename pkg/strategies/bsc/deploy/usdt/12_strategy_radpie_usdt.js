const {deployProxyMulti, deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

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
        usdt: BSC.usdt,
        radpiePoolHelper: '0xEdAb351C299eAe8E06E4f97a3f262Bb4E364612C',
        radiantStaking: '0xe05157aA8D14b8ED1d816D505b3D5DEEB83ca131',
    }
}

module.exports.tags = ['StrategyRadpieUsdt'];
module.exports.strategyRadpieUsdtParams = getParams;
