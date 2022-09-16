const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const hre = require("hardhat");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    if (!hre.ovn.noDeploy) {
        await deployProxyMulti('HedgeExchangerQsWmaticUsdc', 'HedgeExchanger', deployments, save, null);
        console.log("HedgeExchangerQsWmaticUsdc created");
    }

    if (hre.ovn.setting) {
        let exchanger = await ethers.getContract('HedgeExchangerQsWmaticUsdc');
        let ets = await ethers.getContract('EtsQsWmaticUsdc');
        let usdPlus = await getContract('UsdPlusToken');
        let strategy = await getContract('StrategyQsWmaticUsdc');

        if (exchanger) {
            await (await exchanger.setTokens(usdPlus.address, ets.address)).wait();
            await (await exchanger.setStrategy(strategy.address)).wait();
            await (await exchanger.setCollector('0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46')).wait();
            console.log('Setting done()');
        }
    }
};

module.exports.tags = ['HedgeExchangerQsWmaticUsdc'];
