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
        esRdnt: BSC.esRdnt,
        rdnt: BSC.rdnt,
        wBnb: BSC.wBnb,
        radpiePoolHelper: '0xEdAb351C299eAe8E06E4f97a3f262Bb4E364612C',
        radiantStaking: '0xe05157aA8D14b8ED1d816D505b3D5DEEB83ca131',
        radiantRewardManager: '0x91DD506e1f27f50dd40d0E8634013b1F2393DCa0',
        pancakeSwapV3Router: BSC.pancakeSwapV3Router,
    }
}

module.exports.tags = ['StrategyRadpieUsdt'];
module.exports.strategyRadpieUsdtParams = getParams;
