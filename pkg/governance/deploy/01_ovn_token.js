const {deployProxy} = require("../../../common/utils/deployProxy");

module.exports = async ({deployments}) => {
    const {save} = deployments;
    await deployProxy('OvnToken', deployments, save);
};

module.exports.tags = ['governance','OvnToken'];
