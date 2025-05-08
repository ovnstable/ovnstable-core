const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0xeA1B7153Af7D63e0574cB6B63ccf52428fB33f83';
let hedgeExchanger = '0x7DA99ba6DF2972fDb988c9fC007D0FC6068094d5';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEts', deployments, save, null);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                asset: OPTIMISM.usdc,
                rebaseToken: rebaseToken,
                hedgeExchanger: hedgeExchanger,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyEtsPi'];
