const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deployProxy('RebaseToken',  deployments, save );
    console.log("RebaseTokenTest created");
};

module.exports.tags = ['RebaseTokenTest'];
