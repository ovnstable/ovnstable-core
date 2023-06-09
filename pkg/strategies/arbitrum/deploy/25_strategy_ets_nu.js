const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");

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
        asset: ARBITRUM.usdc,
        rebaseToken: '0x1Ba7Fd36f1510E1CB122D55f44b001265991ECB8',
        hedgeExchanger: '0xD45165e76132FC8e94921932775fD9519EDEd6dA',
    }
}

module.exports.tags = ['StrategyEtsNu'];
module.exports.getParams = getParams;
module.exports.strategyEtsNuParams = getParams;
