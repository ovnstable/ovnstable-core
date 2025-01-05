const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC, POLYGON} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {

        await (await strategy.setTokens(POLYGON.usdc, POLYGON.usdt, POLYGON.izi, POLYGON.yin, POLYGON.uniswapNftToken, POLYGON.weth)).wait();
        await (await strategy.setParams(POLYGON.uniswapV3PositionManager, POLYGON.uniswapV3Pool, POLYGON.izumiBoost,
            POLYGON.uniswapV3Router, POLYGON.balancerPoolIdUsdcTusdDaiUsdt, POLYGON.balancerVault, POLYGON.aaveCurve, POLYGON.quickSwapRouter)).wait();
    });
};

module.exports.tags = ['StrategyIzumi'];
