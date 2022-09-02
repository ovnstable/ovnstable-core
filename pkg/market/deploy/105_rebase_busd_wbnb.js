const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const hre = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;


    if (!hre.ovn.noDeploy) {

        await deployProxyMulti('RebaseTokenBusdWbnb', 'RebaseToken', deployments, save, null);
        console.log("RebaseTokenBusdWbnb created");

    }

    if (hre.ovn.setting) {

        let exchanger = await ethers.getContract('HedgeExchangerBusdWbnb');
        let rebase = await ethers.getContract('RebaseTokenBusdWbnb');

        if (rebase) {
            await (await rebase.setExchanger(exchanger.address)).wait();
            await (await rebase.setName('Rebase BUSD/WBNB', 'BUSD/WBNB')).wait();
        }


    }

};

module.exports.tags = ['RebaseTokenBusdWbnb'];
