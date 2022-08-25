const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let nUsdLPToken = '0x2c6d91accC5Aa38c84653F28A80AEC69325BDd12';
let synToken = '0x5A5fFf6F753d7C11A56A52FE47a177a87e431655';
let swap = '0xF44938b0125A6662f9536281aD2CD6c499F22004';
let miniChefV2 = '0xe8c610fcb63A4974F02Da52f0B4523937012Aaa0';
let pid = 1;
let poolFee0 = 10000; // 1%
let poolFee1 = 500; // 0.05%

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                usdcToken: OPTIMISM.usdc,
                nUsdLPToken: nUsdLPToken,
                synToken: synToken,
                wethToken: OPTIMISM.weth,
                swap: swap,
                miniChefV2: miniChefV2,
                pid: pid,
                uniswapV3Router: OPTIMISM.uniswapV3Router,
                poolFee0: poolFee0,
                poolFee1: poolFee1
            }
        )).wait();
    });
};

module.exports.tags = ['StrategySynapseUsdc'];
