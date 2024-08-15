const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const { POLYGON} = require("@overnight-contracts/common/utils/assets");

let dodoUsdtLPToken = "0xB0B417A00E1831DeF11b242711C3d251856AADe3";
let dodoV1UsdcUsdtPool = "0x813FddecCD0401c4Fa73B092b074802440544E52";
let dodoV2DodoUsdtPool = "0x581c7DB44F2616781C86C331d31c1F09db87A746";
let dodoMineUsdt = "0xF4Ae5322eD8B0af7A4f5161caf33C4894752F0f5";
let dodoV1Helper = "0xDfaf9584F5d229A9DBE5978523317820A8897C5A";
let dodoProxy = "0xa222e6a71D1A1Dd5F279805fbe38d5329C1d0e70";
let dodoApprove = "0x6D310348d5c12009854DFCf72e0DF9027e8cb4f4";


module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {

        await (await strategy.setTokens(
            POLYGON.usdc,
            POLYGON.usdt,
            POLYGON.dodo,
            POLYGON.wMatic,
            dodoUsdtLPToken
        )).wait();

        await (await strategy.setParams(
            dodoV1UsdcUsdtPool,
            dodoV2DodoUsdtPool,
            dodoMineUsdt,
            dodoV1Helper,
            dodoProxy,
            dodoApprove,
            POLYGON.balancerVault,
            POLYGON.balancerPoolIdUsdcTusdDaiUsdt,
            POLYGON.balancerPoolIdWmaticUsdcWethBal
        )).wait();
    });
};

module.exports.tags = ['StrategyDodoUsdt'];
