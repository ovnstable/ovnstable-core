const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const vault = await ethers.getContract("Vault");

    await deploy('ConnectorAAVE', {
        from: deployer,
        args: [],
        log: true,
    });

    await deploy('ConnectorBalancer', {
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
        args: [vault.address, assets.mUsd, assets.imUsd, assets.vimUsd, assets.mta, assets.wMatic],
        log: true,
    });
};

module.exports.tags = ['base','Connectors'];
