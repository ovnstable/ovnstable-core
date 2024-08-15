const {deployProxy, deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {ARBITRUM, OPTIMISM} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {save, deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploySection(async (name) => {
        const rewardLibrary = await deploy("KyberSwapRewardUsdcDaiLibrary", {
            from: deployer,
            skipIfAlreadyDeployed: true,
        });

        console.log('RewardLibrary deployed: ' + rewardLibrary.address);

        let params = {
            factoryOptions: {
                libraries: {
                    "KyberSwapRewardUsdcDaiLibrary": rewardLibrary.address,
                }
            },
            unsafeAllow: ["external-library-linking"]
        };

        await deployProxyMulti(name, 'StrategyKyberSwapUsdcDai', deployments, save, params);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        usdc: OPTIMISM.usdc,
        dai: OPTIMISM.dai,
        oracleUsdc: OPTIMISM.oracleUsdc,
        oracleDai: OPTIMISM.oracleDai,
        uniswapV3Router: OPTIMISM.uniswapV3Router,
        pool: "0x80d39502FC199A5094cf231413F5c20D9ee244c4",
        npm: "0xe222fbe074a436145b255442d919e4e3a6c6a480",
        lm: "0x7d5ba536ab244aaa1ea42ab88428847f25e3e676",
        fee: 8,
        lowerTick: 276319,
        upperTick: 	276329,
        poolId: 42,
        curvePool: OPTIMISM.curve3Pool
    }
}

module.exports.tags = ['StrategyKyberSwapUsdcDai'];
module.exports.getParams = getParams;
module.exports.StrategyKyberSwapUsdcDai = getParams;
