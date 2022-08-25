const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");

let kncToken = '0x22a31bD4cB694433B6de19e0aCC2899E553e9481';
let ldoToken = '0x22a31bD4cB694433B6de19e0aCC2899E553e9481';
let basePositionManager = '0x2B1c7b41f6A8F2b2bc45C3233a5d5FB3cD6dC9A8';
let kyberSwapElasticLM = '0x5C503D4b7DE0633f031229bbAA6A5e4A31cc35d8';
let reinvestmentToken = '0xF9cC934753a127100585812181Ac04d07158A4C2';
let pid = 6;
let synapseSwapRouter = '0x85fCD7Dd0a1e1A9FCD5FD886ED522dE8221C3EE5';
let kyberSwapRouter = '0xC1e7dFE73E1598E3910EF4C7845B68A9Ab6F4c83';
let poolFeeUsdcUsdtInUnits = 8; // 0.008%
let poolFeeKncUsdc = 400; // 0.04%
let poolFeeLdoUsdc = 3000; // 0.3%

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                usdcToken: POLYGON.usdc,
                usdtToken: POLYGON.usdt,
                kncToken: kncToken,
                ldoToken: ldoToken,
                basePositionManager: basePositionManager,
                elasticLM: kyberSwapElasticLM,
                reinvestmentToken: reinvestmentToken,
                pid: pid,
                synapseSwapRouter: synapseSwapRouter,
                kyberSwapRouter: kyberSwapRouter,
                uniswapV3Router: POLYGON.uniswapV3Router,
                poolFeeUsdcUsdtInUnits: poolFeeUsdcUsdtInUnits,
                poolFeeKncUsdc: poolFeeKncUsdc,
                poolFeeLdoUsdc: poolFeeLdoUsdc,
                oracleUsdc: POLYGON.oracleChainlinkUsdc,
                oracleUsdt: POLYGON.oracleChainlinkUsdt
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyKyberSwapUsdcUsdt'];
