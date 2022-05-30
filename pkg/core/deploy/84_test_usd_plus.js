const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");


module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const {save} = deployments;
    await deployProxy('TestUsdPlusToken', deployments, save);


    //  await deploy("TestUsdPlusToken", {
    //     from: deployer,
    //     args: [],
    //     log: true,
    //     skipIfAlreadyDeployed: false
    // });

};

module.exports.tags = ['TestUsdPlusToken'];

