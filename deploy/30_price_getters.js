
const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));


let swapRouter = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff"


module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('IdleUsdcPriceGetter', {
        from: deployer,
        args: [],
        log: true,
    });

    await deploy('BpspTusdPriceGetter', {
        from: deployer,
        args: [],
        log: true,
    });

    await deploy('UsdcPriceGetter', {
        from: deployer,
        args: [],
        log: true,
    });

    await deploy('AUsdcPriceGetter', {
        from: deployer,
        args: [],
        log: true,
    });


    await deploy('A3CrvPriceGetter', {
        from: deployer,
        args: [],
        log: true,
    });

    await deploy('A3CrvGaugePriceGetter', {
        from: deployer,
        args: [],
        log: true,
    });

    await deploy('CrvPriceGetter', {
        from: deployer,
        args: [swapRouter, assets.usdc, assets.crv],
        log: true,
    });

    await deploy('WMaticPriceGetter', {
        from: deployer,
        args: [swapRouter, assets.usdc, assets.wMatic],
        log: true,
    });
};

module.exports.tags = ['base', 'IdleUsdcPriceGetter', 'BpspTusdPriceGetter', 'UsdcPriceGetter', 'AUsdcPriceGetter', 'A3CrvPriceGetter', 'A3CrvGaugePriceGetter', 'CrvPriceGetter', 'WMaticPriceGetter'];

