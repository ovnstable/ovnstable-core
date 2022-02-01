const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));

let balancerVault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
let balancerPoolId = "0x0297e37f1873d2dab4487aa67cd56b58e2f27875000100000000000000000002";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    let exchange = await deploy('Bal2UsdcTokenExchange', {
        from: deployer,
        args: [balancerVault, assets.usdc, assets.bal, balancerPoolId],
        log: true,
    });
    console.log("Deploy Bal2UsdcTokenExchange done");

    await deploy('Bal2UsdcActionBuilder', {
        from: deployer,
        args: [exchange.address, assets.usdc, assets.bal],
        log: true,
    });
    console.log("Deploy Bal2UsdcActionBuilder done");
};

module.exports.tags = ['base','Bal2UsdcActionBuilder', 'Bal2UsdcTokenExchange'];
