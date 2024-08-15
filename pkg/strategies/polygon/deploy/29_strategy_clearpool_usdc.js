const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON, COMMON} = require("@overnight-contracts/common/utils/assets");

let cpoolToken = '0xb08b3603C5F2629eF83510E6049eDEeFdc3A2D91';
let poolBase = '0x9F8e69786dE448e6805c0f75eadbC9323502b194';
let poolMaster = '0x215CCa938dF02c9814BE2D39A285B941FbdA79bA';
let poolFeeCpoolUsdc = 10000; // 1%

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                usdcToken: POLYGON.usdc,
                cpoolToken: cpoolToken,
                poolBase: poolBase,
                poolMaster: poolMaster,
                uniswapV3Router: POLYGON.uniswapV3Router,
                poolFeeCpoolUsdc: poolFeeCpoolUsdc,
                rewardWallet: COMMON.rewardWallet
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyClearpoolUsdc'];
