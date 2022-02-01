const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));

let balancerVault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
let balancerPoolId1 = "0x614b5038611729ed49e0ded154d8a5d3af9d1d9e00010000000000000000001d";
let balancerPoolId2 = "0x0297e37f1873d2dab4487aa67cd56b58e2f27875000100000000000000000002";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    let exchange = await deploy('Mta2UsdcTokenExchange', {
        from: deployer,
        args: [balancerVault, assets.usdc, assets.wMatic, assets.mta, balancerPoolId1, balancerPoolId2],
        log: true,
    });
    console.log("Deploy Mta2UsdcTokenExchange done");

    await deploy('Mta2UsdcActionBuilder', {
        from: deployer,
        args: [exchange.address, assets.usdc, assets.mta],
        log: true,
    });
    console.log("Deploy Mta2UsdcActionBuilder done");
};

module.exports.tags = ['base','token-exchanger', 'Mta2UsdcTokenExchange'];
