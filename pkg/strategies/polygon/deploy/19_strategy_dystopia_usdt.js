const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deployProxy('StrategyDystopiaUsdt', deployments, save);
};

module.exports.tags = ['base', 'StrategyDystopiaUsdt'];
