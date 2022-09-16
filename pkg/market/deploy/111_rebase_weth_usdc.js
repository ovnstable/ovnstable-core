const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const hre = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;


    if (!hre.ovn.noDeploy) {

        await deployProxyMulti('RebaseTokenWethUsdc', 'RebaseToken', deployments, save, null);
        console.log("RebaseTokenWethUsdc created");

    }

    if (hre.ovn.setting) {

        let exchanger = await ethers.getContract('HedgeExchangerWethUsdc');
        let rebase = await ethers.getContract('RebaseTokenWethUsdc');

        if (rebase) {
            await (await rebase.setExchanger(exchanger.address)).wait();
            await (await rebase.setName('Rebase WETH/USDC', 'WETH/USDC')).wait();
        }


    }

};

module.exports.tags = ['RebaseTokenWethUsdc'];
