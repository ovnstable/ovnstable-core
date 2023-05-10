const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('OdosWrapper', deployments, save);
    console.log("OdosWrapper created");
    // await deployProxy('OdosRouter', deployments, save);
    // console.log("OdosRouter created");
};

module.exports.tags = ['OdosWrapper'];
