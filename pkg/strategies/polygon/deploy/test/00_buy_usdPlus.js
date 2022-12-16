const { ethers } = require("hardhat");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {getContract} = require("@overnight-contracts/common/utils/script-utils");

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
    let usdPlus = await getContract('UsdPlusToken');
    await buyonSwap.buy(usdPlus.address, POLYGON.quickSwapRouter, {value: value});

    console.log('Buy USD+: ' + value);
};

module.exports.tags = ['BuyUsdPlus'];
