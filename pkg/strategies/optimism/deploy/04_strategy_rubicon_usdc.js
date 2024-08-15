const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let poolFee = 500; // 0.05%
let rubiconUsdc = '0xe0e112e8f33d3f437D1F895cbb1A456836125952';

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
                rubiconUsdc: rubiconUsdc,
                uniswapV3Router: OPTIMISM.uniswapV3Router,
                poolFee: poolFee
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyRubiconUsdc'];
