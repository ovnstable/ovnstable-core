const { ethers } = require("hardhat");
const {getERC20, getDevWallet} = require("@overnight-contracts/common/utils/script-utils");

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
            let holder = '0xebe80f029b1c02862b9e8a70a7e5317c06f62cae';

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
            break;
    }

    console.log('Buy asset: ' + value);
};

module.exports.tags = ['test'];
