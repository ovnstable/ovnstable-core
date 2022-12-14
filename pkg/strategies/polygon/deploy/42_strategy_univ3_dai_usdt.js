const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

let params =  {
    usdc: POLYGON.usdc,
    usdt: POLYGON.usdt,
    dai: POLYGON.dai,
    oracleUsdc: POLYGON.oracleChainlinkUsdc,
    oracleUsdt: POLYGON.oracleChainlinkUsdt,
    oracleDai: POLYGON.oracleChainlinkDai,
    synapse: POLYGON.synapseSwapRouter,
    npm: '0xc36442b4a4522e871399cd717abdd847ab11fe88',
    fee: 100,
    pool: '0x254aa3A898071D6A2dA0DB11dA73b02B4646078F',
    tickLower: -276327,
    tickUpper: -276323,
    allowedSlippageBp: 50, // 0.5%
}

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyUniV3DaiUsdt', deployments, save, null);
    });

    await settingSection(async (strategy) => {

        await (await strategy.setParams(params)).wait();
    });
};

module.exports.tags = ['StrategyUniV3DaiUsdt'];
