const {ethers} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    const usdPlusAddress = '0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65';
    const exchangeAddress = '0x73cb180bf0521828d8849bc8CF2B920918e23032';
    const baseAssetAddress = '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8';

    let pendleUsdPlusTokenSY = await deploy("PendleUsdPlusTokenSY", {
        from: deployer,
        args: ['Pendle USD+', 'USD+SY', usdPlusAddress, exchangeAddress, baseAssetAddress],
        log: true,
        skipIfAlreadyDeployed: false
    });

    console.log("PendleUsdPlusTokenSY created at " + pendleUsdPlusTokenSY.address);
};

module.exports.tags = ['PendleUsdPlusTokenSY'];
