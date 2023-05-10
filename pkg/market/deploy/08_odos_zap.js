const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deployProxy('OdosZapper', deployments, save);
    console.log("OdosZapper created");
    await deployProxy('ChronosZapper', deployments, save);
    console.log("ChronosZapper created");
    // await deployProxy('OdosRouter', deployments, save);
    // console.log("OdosRouter created");
};

module.exports.tags = ['OdosZapper'];
