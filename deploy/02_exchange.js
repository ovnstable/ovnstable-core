
module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('Exchange', {
        from: deployer,
        args: [],
        log: true,
    });
};

module.exports.tags = ['Exchange'];
