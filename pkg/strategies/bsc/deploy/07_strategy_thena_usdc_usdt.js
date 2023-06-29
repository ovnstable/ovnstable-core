const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
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
        usdc: BSC.usdc,
        usdt: BSC.usdt,
        the: BSC.the,
        lpToken: '0x5EEca990E9B7489665F4B57D27D92c78BC2AfBF2',
        uniProxy: '0x6B3d98406779DDca311E6C43553773207b506Fa6',
        gauge: '0x1011530830c914970CAa96a52B9DA1C709Ea48fb',
        pancakeSwapV3Router: BSC.pancakeSwapV3Router,
        thenaFusionRouter: BSC.thenaFusionRouter,
        oracleUsdc: BSC.chainlinkUsdc,
        oracleUsdt: BSC.chainlinkUsdt,
    }
}

module.exports.tags = ['StrategyThenaUsdcUsdt'];
module.exports.getParams = getParams;
module.exports.StrategyThenaUsdcUsdt = getParams;