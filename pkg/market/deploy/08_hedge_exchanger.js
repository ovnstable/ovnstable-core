const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deployProxy('HedgeExchanger', deployments, save);

    console.log("HedgeExchanger created");
};

module.exports.tags = ['HedgeExchanger'];
