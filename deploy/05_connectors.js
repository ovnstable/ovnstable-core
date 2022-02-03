module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('ConnectorAAVE', {
        from: deployer,
        args: [],
        log: true,
    });
    console.log("Deploy ConnectorAAVE done");

    await deploy('ConnectorBalancer', {
        from: deployer,
        args: [],
        log: true,
    });
    console.log("Deploy ConnectorBalancer done");

    await deploy('ConnectorIDLE', {
        from: deployer,
        args: [],
        log: true,
    });
    console.log("Deploy ConnectorIDLE done");

    await deploy('ConnectorMStable', {
        from: deployer,
        args: [],
        log: true,
    });
    console.log("Deploy ConnectorMStable done");
};

module.exports.tags = ['base','Connectors'];
