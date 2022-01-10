const deployProxy = require('../utils/deployProxy');

module.exports = async ({deployments}) => {
    const {save} = deployments;
    await deployProxy('RewardManager', deployments, save);
};

module.exports.tags = ['base','RewardManager'];
