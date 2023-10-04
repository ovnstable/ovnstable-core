const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEts', deployments, save, null);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        asset: OPTIMISM.usdc,
        rebaseToken: '0x8FdE86B75c61a6B76CfE67860Eee246E44A10Ee6',
        hedgeExchanger: '0x4845B883A0E1461933Fd3B5bDF53Da7F7DEe5508',
    };
}

module.exports.tags = ['StrategyEtsBlackholeOp'];
module.exports.getParams = getParams;
module.exports.strategyEtsKappa = getParams;
