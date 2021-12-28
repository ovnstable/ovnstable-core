const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));

let saveWrapper = "0x299081f52738A4204C3D58264ff44f6F333C6c88";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('ConnectorAAVE', {
        from: deployer,
        args: [],
        log: true,
    });

    await deploy('ConnectorCurve', {
        from: deployer,
        args: [],
        log: true,
    });

    await deploy('ConnectorIDLE', {
        from: deployer,
        args: [],
        log: true,
    });

    await deploy('ConnectorMStable', {
        from: deployer,
        args: [saveWrapper, assets.mUsd, assets.imUsd, assets.vimUsd, assets.mta, assets.wMatic],
        log: true,
    });
};

module.exports.tags = ['base','Connectors'];
