const {deployProxy, deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ARBITRUM} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {save, deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploySection(async (name) => {
        const rewardLibrary = await deploy("AuraRewardUsdcUsdtDaiLibrary", {
            from: deployer
        });

        console.log('AuraRewardUsdcUsdtDaiLibrary deployed: ' + rewardLibrary.address);

        let params = {
            factoryOptions: {
                libraries: {
                    "AuraRewardUsdcUsdtDaiLibrary": rewardLibrary.address,
                }
            },
            unsafeAllow: ["external-library-linking"]
        };

        await deployProxyMulti(name, 'StrategyBalancerDai', deployments, save, params);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        dai: ARBITRUM.dai,
        usdc: ARBITRUM.usdc,
        usdt: ARBITRUM.usdt,
        bbamDai: '0x9e34631547adcf2f8cefa0f5f223955c7b137571',
        bbamUsdc: '0x7c82A23B4C48D796dee36A9cA215b641C6a8709d',
        bbamUsdt: '0x4739e50b59b552d490d3fdc60d200977a38510c0',
        bpt: '0xee02583596aee94cccb7e8ccd3921d955f17982a',
        vault: '0xba12222222228d8ba445958a75a0704d566bf2c8',
        gauge: '0xb0Bdd5000307144Ed7d30Cf4025Ec1FBA9D79D65',
        bbamDaiPoolId: '0x9e34631547adcf2f8cefa0f5f223955c7b137571000000000000000000000407',
        bbamUsdcPoolId: '0x7c82a23b4c48d796dee36a9ca215b641c6a8709d000000000000000000000406',
        bbamUsdtPoolId: '0x4739e50b59b552d490d3fdc60d200977a38510c0000000000000000000000409',
        poolId: '0xee02583596aee94cccb7e8ccd3921d955f17982a00000000000000000000040a',
        oracleDai: ARBITRUM.oracleDai,
        oracleUsdc: ARBITRUM.oracleUsdc,
        oracleUsdt: ARBITRUM.oracleUsdt,
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        wombatRouter: ARBITRUM.wombatRouter,
        wombatBasePool: ARBITRUM.wombatBasePool,
    };
}

module.exports.tags = ['StrategyBalancerDai'];
module.exports.getParams = getParams;
module.exports.strategyBalancerUsdcParams = getParams;
