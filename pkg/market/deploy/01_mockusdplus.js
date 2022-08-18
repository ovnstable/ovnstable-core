const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    let params = {args: ["USD+", "USD+"]}

    await deployProxy('MockUsdPlusToken', deployments, save, params);

    console.log("MockUsdPlusToken created");
};

module.exports.tags = ['test', 'MockUsdPlusToken'];
