const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('OdosSwap', deployments, save);
    console.log("OdosSwap created");
    // await deployProxy('OdosRouter', deployments, save);
    // console.log("OdosRouter created");
};

module.exports.tags = ['OdosSwap'];
