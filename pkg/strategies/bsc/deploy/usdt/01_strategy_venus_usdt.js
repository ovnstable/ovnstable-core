const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {BSC} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                usdt: BSC.usdt,
                vUsdt: BSC.vUsdt,
                unitroller: BSC.unitroller,
                pancakeRouter: BSC.pancakeRouter,
                xvs: BSC.xvs,
                wbnb: BSC.wBnb,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyVenusUsdt'];
