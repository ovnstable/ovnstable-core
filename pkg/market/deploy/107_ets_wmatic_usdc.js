const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const hre = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    if (!hre.ovn.noDeploy) {
        await deployProxyMulti('EtsWmaticUsdc', 'RebaseToken', deployments, save, null);
        console.log("EtsWmaticUsdc created");
    }

    if (hre.ovn.setting) {
        let exchanger = await ethers.getContract('HedgeExchangerWmaticUsdc');
        let ets = await ethers.getContract('EtsWmaticUsdc');

        if (ets) {
            await (await ets.setExchanger(exchanger.address)).wait();
            await (await ets.setName('ETS WMATIC/USDC', 'WMATIC/USDC')).wait();
            console.log('Setting done()');
        }
    }
};

module.exports.tags = ['EtsWmaticUsdc'];
