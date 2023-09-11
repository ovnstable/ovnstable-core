const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
const {ethers} = require("hardhat");
const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    const {save} = deployments;

    let whitelist = await deploy("MockWhitelist", {
        from: deployer,
        args: [  ],
        log: true,
        skipIfAlreadyDeployed: false
    });

    console.log(`MockWhitelist deployed at ${whitelist.address}`);

};

module.exports.tags = ['MockWhitelist'];
