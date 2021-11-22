
module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('Mark2Market', {
        from: deployer,
        args: [],
        log: true,
    });
};

module.exports.tags = ['Mark2Market'];
