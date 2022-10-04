const hre = require("hardhat");
const {getERC20, getDevWallet, transferETH} = require("@overnight-contracts/common/utils/script-utils");
const {fromE6} = require("@overnight-contracts/common/utils/decimals");
const {ethers} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deployer} = await getNamedAccounts();

    let holder = '0x3cbc3bed185b837d79ba18d36a3859ecbcfc3dc8';

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [holder],
    });

    let wallet = await getDevWallet();

    const tx = {
        from: wallet.address,
        to: holder,
        value: ethers.utils.parseEther('1'),
        nonce: await hre.ethers.provider.getTransactionCount(wallet.address, "latest"),
        gasLimit: 229059,
        gasPrice: await hre.ethers.provider.getGasPrice(),
    }
    await wallet.sendTransaction(tx);

    const signerWithAddress = await hre.ethers.getSigner(holder);
    let usdc = await getERC20("usdc");

    await usdc.connect(signerWithAddress).transfer(deployer, await usdc.balanceOf(signerWithAddress.address));
};

module.exports.tags = ['test'];
