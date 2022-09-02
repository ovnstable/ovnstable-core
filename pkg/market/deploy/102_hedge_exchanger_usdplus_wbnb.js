const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const hre = require("hardhat");
const {POLYGON, BSC} = require("@overnight-contracts/common/utils/assets");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({deployments}) => {
    const {save} = deployments;


    if (!hre.ovn.noDeploy) {
        await deployProxyMulti('HedgeExchangerUsdPlusWbnb', 'HedgeExchanger', deployments, save, null);
        console.log("HedgeExchangerUsdPlusWbnb created");
    }

    if (hre.ovn.setting) {

        let exchanger = await ethers.getContract('HedgeExchangerUsdPlusWbnb');
        let rebase = await ethers.getContract('RebaseTokenUsdPlusWbnb');

        let usdPlus = await getContract('UsdPlusToken')
        let strategy = await getContract('StrategyUsdPlusWbnb')

        if (exchanger) {
            await exchanger.setTokens(usdPlus.address, rebase.address);
            await exchanger.setStrategy(strategy.address);
            await exchanger.setCollector('0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46');

            console.log('Setting done()');
        }
    }

};

module.exports.tags = ['HedgeExchangerUsdPlusWbnb'];
