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
    pool: '0x48424f43a7239a01831ca4fbf98a6a553d66d49d',
    tickLowerBorder: -276361, // 0.996310
    tickUpperBorder: -276276, // 1.004814
}

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyMavUsdbcDai', deployments, save, null);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(params)).wait();
    });
};

module.exports.tags = ['StrategyMavUsdbcDai'];
