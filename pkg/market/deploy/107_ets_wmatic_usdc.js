const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const hre = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    if (!hre.ovn.noDeploy) {
        await deployProxyMulti('ETSWmaticUsdc', 'RebaseToken', deployments, save, null);
        console.log("ETSWmaticUsdc created");
    }

    if (hre.ovn.setting) {
        let exchanger = await ethers.getContract('HedgeExchangerWmaticUsdc');
        let ets = await ethers.getContract('ETSWmaticUsdc');

        if (ets) {
            await (await ets.setExchanger(exchanger.address)).wait();
            await (await ets.setName('ETS WMAIC/USDC', 'WMAIC/USDC')).wait();
        }
    }
};

module.exports.tags = ['ETSWmaticUsdc'];
