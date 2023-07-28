const {deployProxy, deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {ARBITRUM, OPTIMISM} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {save, deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploySection(async (name) => {
        const rewardLibrary = await deploy("KyberSwapRewardUsdcUsdtLibrary", {
            from: deployer,
            skipIfAlreadyDeployed: true,
        });

        console.log('RewardLibrary deployed: ' + rewardLibrary.address);

        let params = {
            factoryOptions: {
                libraries: {
                    "KyberSwapRewardUsdcUsdtLibrary": rewardLibrary.address,
                }
            },
            unsafeAllow: ["external-library-linking"]
        };

        await deployProxyMulti(name, 'StrategyKyberSwapUsdcUsdt', deployments, save, params);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};


async function getParams() {
    return {
        usdc: OPTIMISM.usdc,
        usdt: OPTIMISM.usdt,
        oracleUsdc: OPTIMISM.oracleUsdc,
        oracleUsdt: OPTIMISM.oracleUsdt,
        uniswapV3Router: OPTIMISM.uniswapV3Router,
        pool: "0x9766B7fA623A65dFe56D9788c2D39AB4718c80A6",
        npm: "0xe222fbe074a436145b255442d919e4e3a6c6a480",
        lm: "0x7d5ba536ab244aaa1ea42ab88428847f25e3e676",
        fee: 8,
        lowerTick: -5,
        upperTick: 5,
        poolId: 43,
        curve3Pool: OPTIMISM.curve3Pool
    }
}

module.exports.tags = ['StrategyKyberSwapUsdcUsdt'];
module.exports.getParams = getParams;
module.exports.StrategyKyberSwapUsdcUsdt = getParams;
