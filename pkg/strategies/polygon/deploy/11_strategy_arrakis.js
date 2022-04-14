const {deployProxy} = require("../../../common/utils/deployProxy");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {save} = deployments;

    await deployProxy('StrategyArrakis', deployments, save);
};

module.exports.tags = ['base', 'StrategyArrakis'];
