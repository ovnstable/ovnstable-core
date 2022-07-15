const { ethers } = require("hardhat");

const { BSC } = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('BuyonSwap', {
        from: deployer,
        args: [],
        log: true,
    });

    console.log("Deploy BuyonSwap done");

    let value = "99000000000000000000000000";

    const buyonSwap = await ethers.getContract("BuyonSwap");
    await buyonSwap.buy(BSC.busd, BSC.pancakeRouter, {value: value});

    console.log('Buy busd: ' + value);
};

module.exports.tags = ['test'];
