const deployProxy = require('../utils/deployProxy');

module.exports = async ({deployments}) => {
    const {save} = deployments;
    await deployProxy('OvnToken', deployments, save);
};

module.exports.tags = ['base','OvnToken'];
