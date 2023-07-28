const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
const {ethers} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const mockUsdPlusToken = await ethers.getContract("MockUsdPlusToken");

    let pendleUsdPlusTokenSY = await deploy("PendleUsdPlusTokenSY", {
        from: deployer,
        args: ['Pendle USD+', 'USD+SY', mockUsdPlusToken.address],
        log: true,
        skipIfAlreadyDeployed: false
    });

    console.log("PendleUsdPlusTokenSY created at " + pendleUsdPlusTokenSY.address);
};

module.exports.tags = ['PendleUsdPlusTokenSY'];
