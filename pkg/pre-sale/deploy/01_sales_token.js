const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
const {ethers} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    let token = await deploy("SalesToken", {
        from: deployer,
        args: [  ],
        log: true,
        skipIfAlreadyDeployed: false
    });

    console.log(`SalesToken deployed at ${token.address}`);

};

module.exports.tags = ['SalesToken'];
