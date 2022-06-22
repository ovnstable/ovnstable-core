const {ethers} = require("hardhat");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const mockUsdPlusToken = await ethers.getContract("MockUsdPlusToken");

    await deploy('MockExchange', {
        from: deployer,
        args: [mockUsdPlusToken.address, POLYGON.usdc],
        log: true,
    });

    console.log("MockExchange created");
};

module.exports.tags = ['base', 'MockExchange'];
