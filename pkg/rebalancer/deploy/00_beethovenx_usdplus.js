const {ethers} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const asset = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607"; // USDC
    const vault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8"; // Beethovenx Vault
    const uniswapV3Pool = "0xbf16ef186e715668aa29cef57e2fd7f9d48adfe6"; // USDC/DAI
    const poolFee = 1; // 0.01%

    await deploy('RebalancerPlus', {
        from: deployer,
        args: [
            vault,
            asset,
            uniswapV3Pool,
            poolFee
        ],
        log: true,
    });

    console.log('BeethovenxUsdPlus done()');
};

module.exports.tags = ['BeethovenxUsdPlus'];
