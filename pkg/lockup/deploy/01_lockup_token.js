const {ethers} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    let token = await deploy("LockupToken", {
        from: deployer,
        args: [  ],
        log: true,
        skipIfAlreadyDeployed: false
    });

    console.log(`LockupToken deployed at ${token.address}`);

};

module.exports.tags = ['LockupToken'];
