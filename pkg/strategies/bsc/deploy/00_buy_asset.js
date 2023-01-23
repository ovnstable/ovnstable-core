const {ethers} = require("hardhat");
const {getERC20, getDevWallet, transferETH} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deployer} = await getNamedAccounts();

    await transferETH(10, '0x5CB01385d3097b6a189d1ac8BA3364D900666445');
    let holder = '0x5a52e96bacdabb82fd05763e25335261b270efcb';

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
        gasLimit: 10000000,
        gasPrice: await hre.ethers.provider.getGasPrice(),
    }
    await wallet.sendTransaction(tx);

    const signerWithAddress = await hre.ethers.getSigner(holder);
    let busd = await getERC20("busd");

    await busd.connect(signerWithAddress).transfer(deployer, await busd.balanceOf(signerWithAddress.address));

};

module.exports.tags = ['test'];
