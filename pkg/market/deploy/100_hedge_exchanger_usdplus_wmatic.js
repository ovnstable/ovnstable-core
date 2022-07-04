const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deployProxyMulti('HedgeExchangerUsdPlusWmatic', 'HedgeExchanger', deployments, save, null);
    console.log("HedgeExchangerUsdPlusWmatic created");


    await deployProxyMulti('RebaseTokenUsdPlusWmatic', 'RebaseToken', deployments, save, null);
    console.log("RebaseTokenUsdPlusWmatic created");


    let exchanger = await ethers.getContract('HedgeExchangerUsdPlusWmatic');
    let rebase = await ethers.getContract('RebaseTokenUsdPlusWmatic');

    if (rebase) {
        await (await rebase.setExchanger(exchanger.address)).wait();
        await (await rebase.setName('Rebase USD+/WMATIC', 'USD+/WMATIC')).wait();
    }


    if (exchanger) {
        await exchanger.setTokens("0x236eeC6359fb44CCe8f97E99387aa7F8cd5cdE1f", rebase.address, POLYGON.usdc);
        await exchanger.setStrategy("0xEb7f1622980bfF682635E35076bd3115814254A7");
        await exchanger.setCollector('0x5CB01385d3097b6a189d1ac8BA3364D900666445');
    }


};

module.exports.tags = ['HedgeExchangerUsdPlusWmatic'];
