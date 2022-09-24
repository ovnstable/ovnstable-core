const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const hre = require("hardhat");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    if (!hre.ovn.noDeploy) {
        await deployProxyMulti('HedgeExchangerWethWbtc', 'HedgeExchanger', deployments, save, null);
        console.log("HedgeExchangerWethWbtc created");
    }

    if (hre.ovn.setting) {
        let exchanger = await ethers.getContract('HedgeExchangerWethWbtc');
        let ets = await ethers.getContract('RebaseTokenWethWbtc');
        let strategy = await getContract('StrategyWethWbtc');

        if (exchanger) {
            await (await exchanger.setTokens(OPTIMISM.wbtc, ets.address)).wait();
            await (await exchanger.setStrategy(strategy.address)).wait();
            await (await exchanger.setCollector('0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46')).wait();
            console.log('Setting done()');
        }
    }
};

module.exports.tags = ['HedgeExchangerWethWbtc'];
