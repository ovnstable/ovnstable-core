const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        usdcToken: OPTIMISM.usdc,
        opToken: OPTIMISM.op,
        vUsdc: '0x539505Dde2B9771dEBE0898a84441c5E7fDF6BC0',
        poolRewards: '0x6104D21888CD996918C8cbA7480C71271DEE3120',
        uniswapV3Router: OPTIMISM.uniswapV3Router,
        poolFee: 3000
    };
}

module.exports.tags = ['StrategyVesperUsdc'];
module.exports.getParams = getParams;
module.exports.strategyVesperUsdc = getParams;
