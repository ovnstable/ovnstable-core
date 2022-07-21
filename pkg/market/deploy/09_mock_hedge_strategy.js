const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('MockHedgeStrategy', {
        from: deployer,
        log: true,
    });

    console.log("MockHedgeStrategy created");
};

module.exports.tags = ['MockHedgeStrategy'];
