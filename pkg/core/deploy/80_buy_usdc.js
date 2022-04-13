const { ethers } = require("hardhat");


let {POLYGON} = require('../../common/utils/assets');

let uniswapRouter = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff";

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
    await buyonSwap.buy(POLYGON.usdc, uniswapRouter, {value: value});

    console.log('Buy usdc: ' + value);
};

module.exports.tags = ['test'];
