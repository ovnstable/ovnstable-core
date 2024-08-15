const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM, COMMON} = require("@overnight-contracts/common/utils/assets");

let bentoBox = '0xc35DADB65012eC5796536bD9864eD8773aBc74C4';
let tridentRouter = '0xE52180815c81D7711B83412e53259bed6a3aB70a';
let miniChefV2 = '0xB25157bF349295a7Cd31D1751973f426182070D6';
let lpToken = '0xB059CF6320B29780C39817c42aF1a032bf821D90';
let pid = 4;

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                usdc: OPTIMISM.usdc,
                usdt: OPTIMISM.usdt,
                op: OPTIMISM.op,
                sushi: OPTIMISM.sushi,
                bentoBox: bentoBox,
                tridentRouter: tridentRouter,
                miniChefV2: miniChefV2,
                lpToken: lpToken,
                pid: pid,
                oracleUsdc: OPTIMISM.oracleUsdc,
                oracleUsdt: OPTIMISM.oracleUsdt,
                curve3Pool: OPTIMISM.curve3Pool,
                velodromeRouter: OPTIMISM.velodromeRouter,
                rewardWallet: COMMON.rewardWallet,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategySushiswapUsdcUsdt'];
