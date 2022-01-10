const deployProxy = require('../utils/deployProxy');

module.exports = async ({deployments}) => {
    const {save} = deployments;
    await deployProxy('Exchange', deployments, save);
};

module.exports.tags = ['base','Exchange'];
