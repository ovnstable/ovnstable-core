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
        usdt: BSC.usdt,
        usdc: BSC.usdc,
        the: BSC.the,
        lpToken: '0x5EEca990E9B7489665F4B57D27D92c78BC2AfBF2',
        uniProxy: '0xf75c017e3b023a593505e281b565ed35cc120efa',
        clearing: '0xd309290e0a8d2ac77220f80d50406d8e9c69e6de',
        gauge: '0x1011530830c914970CAa96a52B9DA1C709Ea48fb',
        pancakeSwapV3Router: BSC.pancakeSwapV3Router,
        thenaFusionRouter: BSC.thenaFusionRouter,
        oracleUsdt: BSC.chainlinkUsdt,
        oracleUsdc: BSC.chainlinkUsdc,
    }
}

module.exports.tags = ['StrategyThenaUsdtUsdc'];
module.exports.getParams = getParams;
module.exports.StrategyThenaUsdtUsdc = getParams;
