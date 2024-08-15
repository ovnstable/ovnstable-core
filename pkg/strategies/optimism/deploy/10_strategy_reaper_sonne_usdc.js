const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let soUsdc = '0x1891A76d191d5A24bcd06DeA4ACadF4b8aE4b583';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                usdcToken: OPTIMISM.usdc,
                soUsdc: soUsdc,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyReaperSonneUsdc'];
