const {deployProxy} = require("../../../common/utils/deployProxy");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {save} = deployments;

    await deployProxy('StrategyTarotSupplyVaultUsdc', deployments, save);
};

module.exports.tags = ['base', 'StrategyTarotSupplyVaultUsdc'];
