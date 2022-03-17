const { deployProxy } = require("../utils/deployProxy");

module.exports = async ({deployments}) => {
    const {save} = deployments;
    await deployProxy('UsdPlusToken', deployments, save);
};

module.exports.tags = ['base', 'UsdPlusToken'];
