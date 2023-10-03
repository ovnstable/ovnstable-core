const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({getNamedAccounts, deployments}) => {

    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    let token = await deploy("AssetOracleVelodrome", {
        from: deployer,
        args: [ ],
        log: true,
        skipIfAlreadyDeployed: false
    });
};

module.exports.tags = ['AssetOracleVelodrome'];
