const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const hre = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    if (!hre.ovn.noDeploy) {
        await deployProxyMulti('EtsOpUsdc', 'RebaseToken', deployments, save, null);
        console.log("EtsOpUsdc created");
    }

    if (hre.ovn.setting) {
        let exchanger = await ethers.getContract('HedgeExchangerOpUsdc');
        let ets = await ethers.getContract('EtsOpUsdc');

        if (ets) {
            await (await ets.setExchanger(exchanger.address)).wait();
            await (await ets.setName('ETS GARNET', 'GARNET')).wait();
            console.log('Setting done()');
        }
    }
};

module.exports.tags = ['EtsOpUsdc'];
