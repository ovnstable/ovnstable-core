
module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('UsdPlusToken', {
        from: deployer,
        args: [],
        log: true,
    });
};

module.exports.tags = ['base','UsdPlusToken'];
