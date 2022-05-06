

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

     await deploy("MockERC20", {
        from: deployer,
        args: [],
        log: true,
        skipIfAlreadyDeployed: false
    });

};

module.exports.tags = ['MockERC20'];

