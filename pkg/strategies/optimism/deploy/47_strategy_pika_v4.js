const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM, COMMON} = require("@overnight-contracts/common/utils/assets");

let poolFee = 500; // 0.05%
let pika = '0x9b86b2be8edb2958089e522fe0eb7dd5935975ab';
let pikaTokenReward = '0xa6caC988e3Bf78c54F3803B790485Eb8DF3fBAEb';
let pikaFeeReward = '0x060c4cb78f1a4508ad84cf2a65c6df9afe3253fe';
let pikaVester = '0x21a4a5c00ab2fd749ebec8282456d93351459f2a';
let esPika = '0x1508fbb7928aEdc86BEE68C91bC4aFcF493b0e78';

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
                poolFee: poolFee,
                pikaVester: pikaVester,
                esPika: esPika,
                treasureWallet: COMMON.treasureWallet,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyPikaV4'];
