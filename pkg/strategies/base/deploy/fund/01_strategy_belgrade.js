const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {BASE} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    // await deployProxy('StrategyBelgrade', deployments, save);

    let strategy = await getContract('StrategyBelgrade', process.env.STAND);
    let pm = await getContract('FundPortfolioManager', process.env.STAND);
    let roleManager = await getContract('RoleManager', process.env.STAND);
    await (await strategy.setStrategyParams(pm.address, roleManager.address)).wait();
    // await strategy.setParams({
    //     belgrade: '0x3574538349BeE903aF207072131F9e2810160520',
    //     asset: BASE.usdc
    // });
    // await (await strategy.setStrategyName('Belgrade')).wait();
};


module.exports.tags = ['StrategyBelgrade'];
