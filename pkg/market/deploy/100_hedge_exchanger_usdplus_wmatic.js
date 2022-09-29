const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const hre = require("hardhat");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;


    if (!hre.ovn.noDeploy) {
        await deployProxyMulti('HedgeExchangerUsdPlusWmatic', 'HedgeExchanger', deployments, save, null);
        console.log("HedgeExchangerUsdPlusWmatic created");
    }

    if (hre.ovn.setting) {

        let exchanger = await ethers.getContract('HedgeExchangerUsdPlusWmatic');
        let rebase = await ethers.getContract('EtsUsdPlusWmatic');

        if (exchanger) {
            await exchanger.setTokens("0x236eeC6359fb44CCe8f97E99387aa7F8cd5cdE1f", rebase.address, POLYGON.usdc);
            await exchanger.setStrategy("0xEb7f1622980bfF682635E35076bd3115814254A7");
            await exchanger.setCollector('0x5CB01385d3097b6a189d1ac8BA3364D900666445');

        }
    }

};

module.exports.tags = ['HedgeExchangerUsdPlusWmatic'];
