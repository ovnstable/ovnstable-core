const { ethers } = require("hardhat");
const {getERC20, getDevWallet, transferUSDC} = require("@overnight-contracts/common/utils/script-utils");

let {DEFAULT} = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('BuyonSwap', {
        from: deployer,
        args: [],
        log: true,
    });
    console.log("Deploy BuyonSwap done");

    let value = "9900000000000000000000000";

    const buyonSwap = await ethers.getContract("BuyonSwap");
    switch (process.env.STAND) {
        case 'avalanche':
            await buyonSwap.buy(DEFAULT.usdc, DEFAULT.traderJoeRouter, {value: value});
            break;
        case 'bsc':
            await buyonSwap.buy(DEFAULT.busd, DEFAULT.pancakeRouter, {value: value});
            break;
        case 'fantom':
            await buyonSwap.buy(DEFAULT.usdc, DEFAULT.spookySwapRouter, {value: value});
            break;
        case 'polygon':
            await buyonSwap.buy(DEFAULT.usdc, DEFAULT.quickSwapRouter, {value: value});
            break;
        case 'polygon_dev':
            await buyonSwap.buy(DEFAULT.usdc, DEFAULT.quickSwapRouter, {value: value});
            break;
        case 'optimism':
            await transferUSDC(1, deployer);
            break;
    }

    console.log('Buy asset: ' + value);
};

module.exports.tags = ['test'];
