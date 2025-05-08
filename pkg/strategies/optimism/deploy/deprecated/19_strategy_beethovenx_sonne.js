const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {OPTIMISM} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");

let bbaUsdc = "0xEdcfaF390906a8f91fb35B7bAC23f3111dBaEe1C";
let bbaUsdt = "0xb96C5bAda4Bf6A70E71795a3197BA94751DAE2DB";
let bbaDai = "0x62eC8b26C08Ffe504F22390A65e6E3c1e45E9877";

let bpt = "0x428E1CC3099cF461B87D124957A0d48273f334b1";
let bptGauge = "0x2d801513d36aA8aA2579133507462f0DE05a40Ff";

let vault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

let stablePoolId = "0x428e1cc3099cf461b87d124957a0d48273f334b100000000000000000000007f";
let aUsdcPoolId = "0xedcfaf390906a8f91fb35b7bac23f3111dbaee1c00000000000000000000007c";

let gauge = "0x2d801513d36aA8aA2579133507462f0DE05a40Ff";

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
                sonne: OPTIMISM.sonne,
                velodromeRouter: OPTIMISM.velodromeRouter,
            }
        )).wait();
    });

};

module.exports.tags = ['StrategyBeethovenxSonne'];
