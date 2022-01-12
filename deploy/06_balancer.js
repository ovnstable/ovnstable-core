const deployProxy = require('../utils/deployProxy');

module.exports = async ({deployments}) => {
    const {save} = deployments;
    await deployProxy('Balancer', deployments, save);
};

module.exports.tags = ['base','Balancer'];
