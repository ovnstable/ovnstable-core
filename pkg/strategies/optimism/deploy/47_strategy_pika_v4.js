const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let poolFee = 500; // 0.05%
let pika = '0x9b86b2be8edb2958089e522fe0eb7dd5935975ab';
let pikaTokenReward = '0x78136EF4BDcbdABb8D7aa09a33C3c16Ca6381910';
let pikaFeeReward = '0x060c4cb78f1a4508ad84cf2a65c6df9afe3253fe';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {

        await (await strategy.setParams(
            {
                usdc: OPTIMISM.usdc,
                op: OPTIMISM.op,
                pika: pika,
                pikaFeeReward: pikaFeeReward,
                pikaTokenReward: pikaTokenReward,
                uniswapV3Router: OPTIMISM.uniswapV3Router,
                poolFee: poolFee
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyPikaV4'];
