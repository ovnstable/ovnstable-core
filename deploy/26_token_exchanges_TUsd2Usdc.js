const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));

let balancerVault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
let balancerPoolId = "0x0d34e5dd4d8f043557145598e4e2dc286b35fd4f000000000000000000000068";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    let exchange = await deploy('TUsd2UsdcTokenExchange', {
        from: deployer,
        args: [balancerVault, assets.usdc, assets.tUsd, balancerPoolId],
        log: true,
    });
    console.log("Deploy TUsd2UsdcTokenExchange done");

    await deploy('TUsd2UsdcActionBuilder', {
        from: deployer,
        args: [exchange.address, assets.usdc, assets.tUsd],
        log: true,
    });
    console.log("Deploy TUsd2UsdcActionBuilder done");
};

module.exports.tags = ['base', 'token-exchanger', 'TUsd2UsdcActionBuilder', 'TUsd2UsdcTokenExchange'];
