const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deployProxy('StrategyDystopiaDai', deployments, save);
};

module.exports.tags = ['base', 'StrategyDystopiaDai'];
