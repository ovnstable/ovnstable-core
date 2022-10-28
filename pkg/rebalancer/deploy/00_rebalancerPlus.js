const {ethers} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const usdc = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607";
    const balancerVault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
    const uniswapV3Pool = "0xbf16ef186e715668aa29cef57e2fd7f9d48adfe6";
    const poolFee = 1;

    await deploy('RebalancerPlus', {
        from: deployer,
        args: [
            balancerVault,
            usdc,
            uniswapV3Pool,
            poolFee
        ],
        log: true,
    });
};

module.exports.tags = ['RebalancerPlus'];
