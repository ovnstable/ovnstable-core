const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const {getNamedAccounts} = require("hardhat");

module.exports = async ({ deployments }) => {
    const { deploy, save } = deployments;
    const {deployer} = await getNamedAccounts();

     await deploy("Airdrop", {
        from: deployer,
        args: [],
        log: true,
        skipIfAlreadyDeployed: true
    });

    console.log("Airdrop created");
};

module.exports.tags = ['Airdrop'];
