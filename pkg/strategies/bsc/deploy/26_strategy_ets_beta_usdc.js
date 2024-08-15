const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0x8De947B7510FB4511a0a97D515813607D2F3f13c';
let hedgeExchanger = '0x6CB841a321bCbEd949B14838339a2EBb6331e5d1';
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

module.exports.tags = ['StrategyEtsBeta'];
