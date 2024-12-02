const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { BLAST } = require("@overnight-contracts/common/utils/assets");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyThrusterSwap', deployments, save, null);
    });

    // await settingSection('StrategyThrusterSwap', async (strategy) => {
    //     await (await strategy.setParams(await getParams())).wait();
    // });
};

async function getParams() {
    return {
        pool: '0x147e7416d5988b097b3a1859efecc2c5e04fdf96',
        tickRange: [-1, 0],
        binSearchIterations: 20,
        swapSimulatorAddress: "0x8B268F288D233d3739Bc54C7cF8e857ea3e7bD32",
        npmAddress: '0x434575eaea081b735c985fa9bf63cd7b87e227f9', 

        hyperTokenAddress: '0xec73284e4ec9bcea1a7dddf489eaa324c3f7dd31',
        thrustTokenAddress: '0xe36072dd051ce26261bf50cd966311cab62c596e',
        wethTokenAddress: '0x4300000000000000000000000000000000000004' ,

        poolUsdbWeth: '0xf00DA13d2960Cf113edCef6e3f30D92E52906537',
        poolWethHyper: '0xE16fbfcFB800E358De6c3210e86b5f23Fc0f2598',
        poolWethThrust: '0x878C963776F374412C896e4B2a3DB84A36614c7C',

        rewardSwapSlippageBP: 50,
        nfpBooster: '0xAd21b2055974075Ab3E126AC5bF8d7Ee3Fcd848a'
    };
}

module.exports.tags = ['StrategyThrusterSwap'];
module.exports.getParams = getParams;
module.exports.strategySperAlpha = getParams;