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

        await deployProxyMulti(name, 'StrategyAuraDaiUsdcUsdt', deployments, save, params);
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
        bbamDaiPoolId: '0x9e34631547adcf2f8cefa0f5f223955c7b137571000000000000000000000407',
        bbamUsdcPoolId: '0x7c82a23b4c48d796dee36a9ca215b641c6a8709d000000000000000000000406',
        bbamUsdtPoolId: '0x4739e50b59b552d490d3fdc60d200977a38510c0000000000000000000000409',
        poolId: '0xee02583596aee94cccb7e8ccd3921d955f17982a00000000000000000000040a',
        oracleDai: ARBITRUM.oracleDai,
        oracleUsdc: ARBITRUM.oracleUsdc,
        oracleUsdt: ARBITRUM.oracleUsdt,
        auraLp: '0x4fA10A40407BA386E3A863381200b4e6049950fa',
        auraBoosterLite: '0x98ef32edd24e2c92525e59afc4475c1242a30184',
        auraBaseRewardPool: '0x4fa10a40407ba386e3a863381200b4e6049950fa',
        wombatRouter: ARBITRUM.wombatRouter,
        wombatBasePool: ARBITRUM.wombatBasePool,
    };
}

module.exports.tags = ['StrategyAuraDaiUsdcUsdt'];
module.exports.getParams = getParams;
module.exports.StrategyAuraDaiUsdcUsdt = getParams;
