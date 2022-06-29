const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deployProxy('Swapper', deployments, save);
};

module.exports.tags = ['base', 'Swapper'];
