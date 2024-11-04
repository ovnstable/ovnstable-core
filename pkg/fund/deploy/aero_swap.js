const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({deployments}) => {
    const {save} = deployments;
    await deployProxy('AeroSwap', deployments, save);
};

module.exports.tags = ['AeroSwap'];
