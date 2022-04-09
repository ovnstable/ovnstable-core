const { ethers } = require("hardhat");

let {FANTOM} = require('../../../common/utils/assets');

let uniswapRouter = "0xF491e7B69E4244ad4002BC14e878a34207E38c29";

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
    await buyonSwap.buy(FANTOM.usdc, uniswapRouter, {value: value});

    console.log('Buy usdc: ' + value);
};

module.exports.tags = ['test', 'BuyUsdc'];
