const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

let meshToken = '0x82362Ec182Db3Cf7829014Bc61E9BE8a2E82868a';
let meshSwapUsdcUsdt = '0x274EBd0A589445d2759E379277984c19dbF83cFD';
let meshSwapRouter = '0x10f4A785F458Bc144e3706575924889954946639';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {

        await (await strategy.setTokens(POLYGON.usdc, POLYGON.usdt, meshToken)).wait();
        await (await strategy.setParams(meshSwapUsdcUsdt, meshSwapRouter, POLYGON.balancerVault, POLYGON.balancerPoolIdUsdcTusdDaiUsdt)).wait();
    });
};

module.exports.tags = ['StrategyMeshSwapUsdcUsdt'];
