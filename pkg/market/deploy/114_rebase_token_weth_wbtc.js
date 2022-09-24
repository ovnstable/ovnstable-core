const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const hre = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    if (!hre.ovn.noDeploy) {
        await deployProxyMulti('RebaseTokenWethWbtc', 'RebaseToken', deployments, save, null);
        console.log("RebaseTokenWethWbtc created");
    }

    if (hre.ovn.setting) {
        let exchanger = await ethers.getContract('HedgeExchangerWethWbtc');
        let rebaseToken = await ethers.getContract('RebaseTokenWethWbtc');

        if (rebaseToken) {
            await (await rebaseToken.setExchanger(exchanger.address)).wait();
            await (await rebaseToken.setDecimals(8)).wait();
            await (await rebaseToken.setName('ETS WETH/WBTC', 'WETH/WBTC')).wait();
            console.log('Setting done()');
        }
    }
};

module.exports.tags = ['RebaseTokenWethWbtc'];
