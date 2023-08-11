const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BASE} = require("@overnight-contracts/common/utils/assets");

let params =  {
    usdc: BASE.usdbc,
    dai: BASE.dai,
    oracleUsdc: BASE.chainlinkUsdc,
    oracleDai: BASE.chainlinkDai,
    balancerVault: '0xba12222222228d8ba445958a75a0704d566bf2c8',
    poolId: '0x6fbfcf88db1aada31f34215b2a1df7fafb4883e900000000000000000000000c',
    npm: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
    fee: 100,
    pool: '0x22f9623817f152148b4e080e98af66fbe9c5adf8',
    tickLower: -276289,
    tickUpper: -276288,
    allowedSwapSlippage: 50, // 0.5%
    allowedStakeSlippage: 100, // 1%
}

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyUniV3Dai', deployments, save, null);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(params)).wait();
    });
};

module.exports.tags = ['StrategyUniV3Dai'];
