const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {BASE} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyMorpho', deployments, save, null);
    });

    await settingSection('', async (strategy) => {
        await (await strategy.setParams(getParamsBeta())).wait();
    });
};

function getParamsBeta() {
    return {
        usdc: BASE.usdc,
        mUsdc: BASE.gcUsdc,
        well: BASE.well,
        morpho: BASE.morphoToken,
        uniswapV3Router: BASE.uniswapV3Router
    };
};


module.exports.strategyMorphoBeta = getParamsBeta;
module.exports.tags = ['StrategyMorphoBeta'];
