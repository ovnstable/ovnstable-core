const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let gauge = '0xd2d95775d35a6d492ced7c7e26817aacb7d264f2';
let pair = '0x67124355cce2ad7a8ea283e990612ebe12730175';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                usdc: OPTIMISM.usdc,
                usdp: OPTIMISM.usdPlus,
                velo: OPTIMISM.velo,
                router: OPTIMISM.velodromeRouter,
                gauge: gauge,
                pair: pair,
                curvePool: OPTIMISM.curve3Pool
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyVelodromeUsdcUsdPlus'];
