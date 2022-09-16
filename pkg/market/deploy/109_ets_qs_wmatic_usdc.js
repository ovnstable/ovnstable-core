const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const hre = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    if (!hre.ovn.noDeploy) {
        await deployProxyMulti('EtsQsWmaticUsdc', 'RebaseToken', deployments, save, null);
        console.log("EtsQsWmaticUsdc created");
    }

    if (hre.ovn.setting) {
        let exchanger = await ethers.getContract('HedgeExchangerQsWmaticUsdc');
        let ets = await ethers.getContract('EtsQsWmaticUsdc');

        if (ets) {
            await (await ets.setExchanger(exchanger.address)).wait();
            await (await ets.setName('ETS MOONSTONE', 'MOONSTONE')).wait();
            console.log('Setting done()');
        }
    }
};

module.exports.tags = ['EtsQsWmaticUsdc'];
