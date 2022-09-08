const hre = require("hardhat");
const {getERC20, getDevWallet} = require("@overnight-contracts/common/utils/script-utils");
const {fromE6} = require("@overnight-contracts/common/utils/decimals");
const {ethers} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deployer} = await getNamedAccounts();

    let holder = '0xad7b4c162707e0b2b5f6fddbd3f8538a5fba0d60';

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

    await usdc.connect(signerWithAddress).transfer(deployer, '10000000000000');
};

module.exports.tags = ['test'];
