const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

let dodoUsdcLPToken = "0x2C5CA709d9593F6Fd694D84971c55fB3032B87AB";
let dodoV1UsdcUsdtPool = "0x813FddecCD0401c4Fa73B092b074802440544E52";
let dodoV2DodoUsdtPool = "0x581c7DB44F2616781C86C331d31c1F09db87A746";
let dodoMineUsdc = "0xCd288Dd48d26a9f671a1a06bcc48c2A3ee800A13";
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
            dodoUsdcLPToken
        )).wait();

        await (await strategy.setParams(
            dodoV1UsdcUsdtPool,
            dodoV2DodoUsdtPool,
            dodoMineUsdc,
            dodoV1Helper,
            dodoProxy,
            dodoApprove,
            POLYGON.balancerVault,
            POLYGON.balancerPoolIdWmaticUsdcWethBal
        )).wait();
    });
};

module.exports.tags = ['StrategyDodoUsdc'];
