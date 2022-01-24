
const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));


let swapRouter = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff"


module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();


    let exchange = await deploy('Crv2UsdcTokenExchange', {
        from: deployer,
        args: [swapRouter, assets.usdc, assets.crv],
        log: true,
    });

    await deploy('Crv2UsdcActionBuilder', {
        from: deployer,
        args: [exchange.address,assets.usdc, assets.crv],
        log: true,
    });
};

module.exports.tags = ['base','token-exchanger','Crv2UsdcTokenExchange'];
