const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({deployments}) => {
    const {save} = deployments;
    await deployProxy('Market', deployments, save);

    console.log("Market created");
};

module.exports.tags = ['base', 'test', 'Market'];
