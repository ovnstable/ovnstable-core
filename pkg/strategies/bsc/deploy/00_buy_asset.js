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
    switch (process.env.STAND) {
        case 'bsc_usdc':
            await buyonSwap.buy(BSC.usdc, BSC.pancakeRouter, {value: value});
            break;
        case 'bsc_usdt':
            await buyonSwap.buy(BSC.usdt, BSC.pancakeRouter, {value: value});
            break;
        default:
            await buyonSwap.buy(BSC.busd, BSC.pancakeRouter, {value: value});
            break;
    }

    console.log('Buy asset: ' + value);
};

module.exports.tags = ['test'];
