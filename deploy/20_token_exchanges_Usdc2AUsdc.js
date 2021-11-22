const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();


    const connectorAAVE = await ethers.getContract("ConnectorAAVE");

    let exchange = await deploy('Usdc2AUsdcTokenExchange', {
        from: deployer,
        args: [connectorAAVE.address, assets.usdc, assets.amUsdc],
        log: true,
    });

    await deploy('Usdc2AUsdcActionBuilder', {
        from: deployer,
        args: [exchange.address,assets.usdc, assets.amUsdc],
        log: true,
    });
};

module.exports.tags = ['Usdc2AUsdcActionBuilder', 'Usdc2AUsdcTokenExchange'];
