const { ethers } = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const mockUsdPlusToken = await ethers.getContract("MockUsdPlusToken");
    const mockExchange = await ethers.getContract("MockExchange");
    mockUsdPlusToken.setExchanger(mockExchange.address);

    console.log("MockExchange settings done");
};

module.exports.tags = ['test_setting', 'SettingMockExchange'];
