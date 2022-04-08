const {deployProxy} = require("../../../common/utils/deployProxy");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deployProxy('StrategyDodoUsdc', deployments, save);
};

module.exports.tags = ['base', 'StrategyDodoUsdc'];
