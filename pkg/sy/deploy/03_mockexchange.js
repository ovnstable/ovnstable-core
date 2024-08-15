const {ethers} = require("hardhat");

let {ARBITRUM} = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const mockUsdPlusToken = await ethers.getContract("MockUsdPlusToken");

    await deploy('MockExchange', {
        from: deployer,
        args: [mockUsdPlusToken.address, ARBITRUM.usdc],
        log: true,
    });

    console.log("MockExchange created");
};

module.exports.tags = ['MockExchange'];
