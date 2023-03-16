const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");


module.exports = async ({deployments}) => {
    const {save} = deployments;

    let params = {args: ["test USD+", "test USD+", 6]}

    await deployProxy('TestUsdPlusToken', deployments, save, params);
};

module.exports.tags = ['TestUsdPlusToken'];

