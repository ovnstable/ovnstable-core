const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {OPTIMISM} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");

let bbaUsdc = "0xba7834bb3cd2DB888E6A06Fb45E82b4225Cd0C71";
let bbaUsdt = "0x9253d7e1B42fa01eDE2c53f3A21b3B4d13239cD4";
let bbaDai = "0x888a6195D42a95e80D81e1c506172772a80b80Bc";
let bpt = "0x6222ae1d2a9f6894dA50aA25Cb7b303497f9BEbd";
let bptGauge = "0xDC785Bc8280D8fdB89aEb4980e061e34a34e71d4";
let vault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
let stablePoolId = "0x6222ae1d2a9f6894da50aa25cb7b303497f9bebd000000000000000000000046";
let aUsdcPoolId = "0xba7834bb3cd2db888e6a06fb45e82b4225cd0c71000000000000000000000043";
let gauge = "0xDC785Bc8280D8fdB89aEb4980e061e34a34e71d4";
let poolUsdcOpFee = 500; // 0.05%

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                usdc: OPTIMISM.usdc,
                bbaUsdc: bbaUsdc,
                bbaUsdt: bbaUsdt,
                bbaDai: bbaDai,
                bpt: bpt,
                bptGauge: bptGauge,
                vault: vault,
                stablePoolId: stablePoolId,
                aUsdcPoolId: aUsdcPoolId,
                gauge: gauge,
                oracleDai: OPTIMISM.oracleDai,
                oracleUsdt: OPTIMISM.oracleUsdt,
                oracleUsdc: OPTIMISM.oracleUsdc,
                op: OPTIMISM.op,
                uniswapV3Router: OPTIMISM.uniswapV3Router,
                poolFee: poolUsdcOpFee,
            }
        )).wait();
    });

};

module.exports.tags = ['StrategyBeethovenxUsdc'];
