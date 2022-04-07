const { deployProxy } = require("../../common/utils/deployProxy");

module.exports = async ({deployments}) => {
    const {save} = deployments;
    await deployProxy('Mark2Market', deployments, save);
};

module.exports.tags = ['base','Mark2Market'];
