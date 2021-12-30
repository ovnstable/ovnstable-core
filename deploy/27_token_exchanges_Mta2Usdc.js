const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));

let balancerVault = "0xba12222222228d8ba445958a75a0704d566bf2c8";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    let exchange = await deploy('Mta2UsdcTokenExchange', {
        from: deployer,
        args: [balancerVault, assets.usdc, assets.mta],
        log: true,
    });

    await deploy('Mta2UsdcActionBuilder', {
        from: deployer,
        args: [exchange.address, assets.usdc, assets.mta],
        log: true,
    });
};

module.exports.tags = ['base', 'Mta2UsdcActionBuilder', 'Mta2UsdcTokenExchange'];
