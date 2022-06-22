const {ethers} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const mockUsdPlusToken = await ethers.getContract("MockUsdPlusToken");

    await deploy('StaticUsdPlusToken', {
        from: deployer,
        args: ['0x236eeC6359fb44CCe8f97E99387aa7F8cd5cdE1f'],
        log: true,
    });

    console.log("StaticUsdPlusToken created");
};

module.exports.tags = ['base', 'StaticUsdPlusToken'];
