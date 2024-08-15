const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deployProxy('RebaseToken', deployments, save );
    console.log("RebaseToken created");
};

module.exports.tags = ['RebaseToken'];
