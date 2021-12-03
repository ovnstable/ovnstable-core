const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();


    const ConnectorIDLE = await ethers.getContract("ConnectorIDLE");

    let exchange = await deploy('Usdc2IdleUsdcTokenExchange', {
        from: deployer,
        args: [ConnectorIDLE.address, assets.usdc, assets.idleUsdc],
        log: true,
    });

    await deploy('Usdc2IdleUsdcActionBuilder', {
        from: deployer,
        args: [exchange.address,assets.usdc, assets.idleUsdc],
        log: true,
    });
};

module.exports.tags = ['base','Usdc2IdleUsdcActionBuilder', 'Usdc2IdleUsdcTokenExchange'];
