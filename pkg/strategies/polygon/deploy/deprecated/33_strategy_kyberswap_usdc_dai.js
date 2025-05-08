const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");

let kncToken = '0x1C954E8fe737F99f68Fa1CCda3e51ebDB291948C';
let basePositionManager = '0x2B1c7b41f6A8F2b2bc45C3233a5d5FB3cD6dC9A8';
let kyberSwapElasticLM = '0xbdec4a045446f583dc564c0a227ffd475b329bf0';
let reinvestmentToken = '0x96ba6a0b7285ec343f318691e34f50fe0d4358b6';
let pid = 10;
let synapseSwapRouter = '0x85fCD7Dd0a1e1A9FCD5FD886ED522dE8221C3EE5';
let poolUsdcKnc = '0xCBD258f33B7A2705e8418708a4F615C43fedf23c';
let poolFeeUsdcDaiInUnits = 8; // 0.008%

let tickLower = 276324;
let tickUpper = 276325;

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                usdcToken: POLYGON.usdc,
                daiToken: POLYGON.dai,
                kncToken: kncToken,
                basePositionManager: basePositionManager,
                elasticLM: kyberSwapElasticLM,
                reinvestmentToken: reinvestmentToken,
                pid: pid,
                synapseSwapRouter: synapseSwapRouter,
                poolUsdcKnc: poolUsdcKnc,
                poolFeeUsdcDaiInUnits: poolFeeUsdcDaiInUnits,
                oracleUsdc: POLYGON.oracleChainlinkUsdc,
                oracleDai: POLYGON.oracleChainlinkDai,
                tickLower: tickLower,
                tickUpper: tickUpper
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyKyberSwapUsdcDai'];
