const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setTokens(OPTIMISM.usdc, OPTIMISM.dai, OPTIMISM.wMatic)).wait();

        await (await strategy.setParams(
            OPTIMISM.oracleChainlinkUsdc,
            OPTIMISM.oracleChainlinkDai,
        )).wait();
    });
};

module.exports.tags = ['StrategyVelodromeUsdcDai'];
