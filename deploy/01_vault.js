const deployProxy = require('../utils/deployProxy');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {save} = deployments;
    await deployProxy('Vault', deployments, save);
};

module.exports.tags = ['base', 'Vault'];
