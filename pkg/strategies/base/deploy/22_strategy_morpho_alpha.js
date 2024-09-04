const {deployProxy, deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {BASE} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyMorpho', deployments, save, null);
    });

    await settingSection('', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        usdc: BASE.usdc,
        mUsdc: BASE.mwUsdc,
        well: BASE.well,
        uniswapV3Router: BASE.uniswapV3Router
    };
}

module.exports.tags = ['StrategyMorphoAlpha'];
