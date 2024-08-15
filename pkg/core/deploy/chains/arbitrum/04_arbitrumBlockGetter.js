const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy("ArbitrumBlockGetter", {
        from: deployer,
        args: [],
        log: true,
        skipIfAlreadyDeployed: false
    });

    console.log('ArbitrumBlockGetter deploy done()');
};

module.exports.tags = ['ArbitrumBlockGetter'];
