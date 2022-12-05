const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0x2a0821a851F75de8E4057C5ebd05dce7288A035B';
let hedgeExchanger = '0xB53Ecca6CB52279e80D8d05a0BC741aDf50bfce4';
let allowedSlippageBp = 100;

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
                synapseSwap: POLYGON.synapseSwapRouter,
                oracleUsdc: POLYGON.oracleChainlinkUsdc,
                oracleDai: POLYGON.oracleChainlinkDai,
                allowedSlippageBp: allowedSlippageBp,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyEtsEpsilon'];
