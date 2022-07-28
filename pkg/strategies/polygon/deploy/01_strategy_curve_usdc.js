const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {

        await (await strategy.setTokens(POLYGON.usdc, POLYGON.am3CRV, POLYGON.am3CRVgauge, POLYGON.crv, POLYGON.wMatic)).wait();
        await (await strategy.setParams(POLYGON.crvAavePool, POLYGON.am3CRVgauge, POLYGON.quickSwapRouter)).wait();
    });
};

module.exports.tags = ['StrategyCurve'];
