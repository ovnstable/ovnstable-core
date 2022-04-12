const { ethers } = require("hardhat");

let {POLYGON} = require('../../../common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('BuyonSwap', {
        from: deployer,
        args: [],
        log: true,
    });
    console.log("Deploy BuyonSwap done");

    let value = "5000000000000000000000000";

    const buyonSwap = await ethers.getContract("BuyonSwap");
    await buyonSwap.buy(POLYGON.usdc, POLYGON.quickSwapRouter, {value: value});

    console.log('Buy usdc: ' + value);
};

module.exports.tags = ['test' ];
