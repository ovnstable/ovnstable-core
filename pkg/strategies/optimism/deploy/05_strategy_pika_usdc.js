const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let poolFee = 500; // 0.05%
let pika = '0xD5A8f233CBdDb40368D55C3320644Fb36e597002';
let pikaTokenReward = '0x78136EF4BDcbdABb8D7aa09a33C3c16Ca6381910';
let pikaFeeReward = '0x939c11c596B851447e5220584d37F12854bA02ae';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {

        await (await strategy.setParams(
            {
                usdcToken: OPTIMISM.usdc,
                opToken: OPTIMISM.op,
                pika: pika,
                pikaFeeReward: pikaFeeReward,
                pikaTokenReward: pikaTokenReward,
                uniswapV3Router: OPTIMISM.uniswapV3Router,
                poolFee: poolFee
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyPikaUsdc'];
