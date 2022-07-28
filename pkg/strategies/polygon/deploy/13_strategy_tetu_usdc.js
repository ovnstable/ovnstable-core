const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");


let usdcSmartVault = '0xeE3B4Ce32A6229ae15903CDa0A5Da92E739685f7';
let xTetuSmartVault = '0x225084D30cc297F3b177d9f93f5C3Ab8fb6a1454';
let tetuSwapRouter = '0xBCA055F25c3670fE0b1463e8d470585Fe15Ca819';


module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {

        await (await strategy.setTokens(POLYGON.usdc, POLYGON.tetu)).wait();
        await (await strategy.setParams(usdcSmartVault, xTetuSmartVault, tetuSwapRouter)).wait();
    });
};

module.exports.tags = ['StrategyTetuUsdc'];
