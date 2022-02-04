const deployProxy = require('../utils/deployProxy');

module.exports = async ({deployments}) => {
    const {save} = deployments;
    await deployProxy('Portfolio', deployments, save);
};

module.exports.tags = ['base','Portfolio'];
