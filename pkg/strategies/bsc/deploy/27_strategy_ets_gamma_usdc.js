const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0xE090BccbfD5BbB5432Aee93D82EF55fcDE88e49e';
let hedgeExchanger = '0x13B8883fCe15f9DC035621D09b97aFe46Cf11934';
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

module.exports.tags = ['StrategyEtsGamma'];
