const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const hre = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    if (!hre.ovn.noDeploy) {
        await deployProxyMulti('EtsWethUsdc', 'RebaseToken', deployments, save, null);
        console.log("EtsWethUsdc created");
    }

    if (hre.ovn.setting) {
        let exchanger = await ethers.getContract('HedgeExchangerWethUsdc');
        let rebase = await ethers.getContract('EtsWethUsdc');

        if (rebase) {
            await (await rebase.setExchanger(exchanger.address)).wait();
            await (await rebase.setName('ETS RUBY', 'RUBY')).wait();
            console.log('Setting done()');
        }
    }
};

module.exports.tags = ['EtsWethUsdc'];
