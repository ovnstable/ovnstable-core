
module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('ConnectorAAVE', {
        from: deployer,
        args: [],
        log: true,
    });

    await deploy('ConnectorBalancer', {
        from: deployer,
        args: [],
        log: true,
    });

    await deploy('ConnectorCurve', {
        from: deployer,
        args: [],
        log: true,
    });

    await deploy('ConnectorIDLE', {
        from: deployer,
        args: [],
        log: true,
    });
};

module.exports.tags = ['base','Connectors'];
