module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('MockUsdPlusToken', {
        from: deployer,
        args: [],
        log: true,
    });

    console.log("MockUsdPlusToken created");
};

module.exports.tags = ['test', 'MockUsdPlusToken'];
