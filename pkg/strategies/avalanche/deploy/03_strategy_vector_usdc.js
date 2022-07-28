const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {AVALANCHE} = require("@overnight-contracts/common/utils/assets");

let ptpToken = "0x22d4002028f537599bE9f666d1c4Fa138522f9c8";
let vtxToken = "0x5817D4F0b62A59b17f75207DA1848C2cE75e7AF4";
let poolHelper = "0x994F0e36ceB953105D05897537BF55d201245156";
let mainStaking = "0x8B3d9F0017FA369cD8C164D0Cc078bf4cA588aE5";


module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {

        await (await strategy.setTokens(AVALANCHE.usdc, AVALANCHE.wAvax, ptpToken, vtxToken)).wait();
        await (await strategy.setParams(AVALANCHE.traderJoeRouter, poolHelper, mainStaking)).wait();
    });
};

module.exports.tags = ['StrategyVectorUsdc'];
