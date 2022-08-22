const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const hre = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;


    if (!hre.ovn.noDeploy) {

        await deployProxyMulti('RebaseTokenUsdPlusWmatic', 'RebaseToken', deployments, save, null);
        console.log("RebaseTokenUsdPlusWmatic created");

    }

    if (hre.ovn.setting) {

        let exchanger = await ethers.getContract('HedgeExchangerUsdPlusWmatic');
        let rebase = await ethers.getContract('RebaseTokenUsdPlusWmatic');

        if (rebase) {
            await (await rebase.setExchanger(exchanger.address)).wait();
            await (await rebase.setName('Rebase USD+/WMATIC', 'USD+/WMATIC')).wait();
        }


    }

};

module.exports.tags = ['RebaseTokenUsdPlusWmatic'];
