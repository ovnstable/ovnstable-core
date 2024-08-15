const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0x5B852898CD47d2Be1d77D30377b3642290f5Ec75';
let hedgeExchanger = '0x65AfD05fbc4413948ffaaD8bCb13f71b6f79332D';
let wombatPool = '0x312Bc7eAAF93f1C60Dc5AfC115FcCDE161055fb0';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEtsUsdcUsdt', deployments, save, null);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                asset: BSC.usdc,
                usdt: BSC.usdt,
                rebaseToken: rebaseToken,
                hedgeExchanger: hedgeExchanger,
                wombatRouter: BSC.wombatRouter,
                wombatPool: wombatPool,
                oracleAsset: BSC.chainlinkUsdc,
                oracleUsdt: BSC.chainlinkUsdt,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyEtsAlpha'];
