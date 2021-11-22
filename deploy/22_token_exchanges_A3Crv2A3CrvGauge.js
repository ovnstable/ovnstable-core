const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));

let curveGaugeAddress = "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c"

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();


    let exchange = await deploy('A3Crv2A3CrvGaugeTokenExchange', {
        from: deployer,
        args: [curveGaugeAddress],
        log: true,
    });

    await deploy('A3Crv2A3CrvGaugeActionBuilder', {
        from: deployer,
        args: [exchange.address, assets.am3CRV, assets.am3CRVgauge],
        log: true,
    });
};

module.exports.tags = ['A3Crv2A3CrvGaugeActionBuilder', 'A3Crv2A3CrvGaugeTokenExchange'];
