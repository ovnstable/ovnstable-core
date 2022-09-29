const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const hre = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;


    if (!hre.ovn.noDeploy) {

        await deployProxyMulti('EtsUsdPlusWbnb', 'RebaseToken', deployments, save, null);
        console.log("EtsUsdPlusWbnb created");

    }

    if (hre.ovn.setting) {

        let exchanger = await ethers.getContract('HedgeExchangerUsdPlusWbnb');
        let rebase = await ethers.getContract('EtsUsdPlusWbnb');

        if (rebase) {
            await (await rebase.setExchanger(exchanger.address)).wait();
            await (await rebase.setName('Rebase USD+/WBNB', 'USD+/WBNB')).wait();
        }


    }

};

module.exports.tags = ['EtsUsdPlusWbnb'];
