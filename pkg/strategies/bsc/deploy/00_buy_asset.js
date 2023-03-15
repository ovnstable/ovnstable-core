const {ethers} = require("hardhat");
const {getERC20, getDevWallet, transferETH} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deployer} = await getNamedAccounts();

    await transferETH(10, '0x5CB01385d3097b6a189d1ac8BA3364D900666445');
    let holder = '0x8894e0a0c962cb723c1976a4421c95949be2d4e3';
    let usdc = await getERC20("usdc");

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [holder],
    });

    const signerWithAddress = await hre.ethers.getSigner(holder);

    await usdc.connect(signerWithAddress).transfer(deployer, await usdc.balanceOf(signerWithAddress.address));
    
    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [holder],
    });
};

module.exports.tags = ['test'];
