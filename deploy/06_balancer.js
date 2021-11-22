
module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('Balancer', {
        from: deployer,
        args: [],
        log: true,
    });


};

module.exports.tags = ['Balancer'];
