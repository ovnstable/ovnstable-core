const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0x8268609395784EBF89F26F22ac45852E1F25f597';
let hedgeExchanger = '0xe63ae88251aaf0bc2ea4d3637D3131A294FD74d7';
let poolUsdcDaiFee = 100; // 0.01%
let allowedSlippageBp = 10;

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {

        await (await strategy.setParams(
            {
                usdc: POLYGON.usdc,
                dai: POLYGON.dai,
                rebaseToken: rebaseToken,
                hedgeExchanger: hedgeExchanger,
                uniswapV3Router: POLYGON.uniswapV3Router,
                poolUsdcDaiFee: poolUsdcDaiFee,
                oracleUsdc: POLYGON.oracleChainlinkUsdc,
                oracleDai: POLYGON.oracleChainlinkDai,
                allowedSlippageBp: allowedSlippageBp,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyEtsEpsilon'];
