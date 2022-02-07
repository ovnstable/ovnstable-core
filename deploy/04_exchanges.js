let balancerVault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
let swapRouter = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('BalancerExchange', {
        from: deployer,
        args: [balancerVault],
        log: true,
    });
    console.log("Deploy BalancerExchange done");

    await deploy('QuickswapExchange', {
        from: deployer,
        args: [swapRouter],
        log: true,
    });
    console.log("Deploy QuickswapExchange done");
};

module.exports.tags = ['base', 'Exchanges'];