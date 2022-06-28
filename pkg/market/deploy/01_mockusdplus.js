const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({deployments}) => {
    const {save} = deployments;
    await deployProxy('MockUsdPlusToken', deployments, save);

    console.log("MockUsdPlusToken created");
};

module.exports.tags = ['test', 'MockUsdPlusToken'];
