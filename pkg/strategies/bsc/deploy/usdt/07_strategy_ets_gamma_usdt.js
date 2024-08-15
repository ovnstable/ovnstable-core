const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0xE090BccbfD5BbB5432Aee93D82EF55fcDE88e49e';
let hedgeExchanger = '0x13B8883fCe15f9DC035621D09b97aFe46Cf11934';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEts', deployments, save, null);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                asset: BSC.usdt,
                rebaseToken: rebaseToken,
                hedgeExchanger: hedgeExchanger
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyEtsGammaUsdt'];
