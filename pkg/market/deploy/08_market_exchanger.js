const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deployProxy('MarketExchanger', deployments, save);

    console.log("MarketExchanger created");
};

module.exports.tags = ['MarketExchanger'];
