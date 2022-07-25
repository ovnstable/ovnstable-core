const {ethers} = require("hardhat");

const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {BSC} = require('@overnight-contracts/common/utils/assets');
const {core} = require('@overnight-contracts/common/utils/core');
const hre = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    if (hre.ovn === undefined || !hre.ovn.noDeploy) {
        await deployProxy('StrategyVenusBusd', deployments, save);

        console.log('StrategyVenusBusd deploy done');
    }

    if (hre.ovn === undefined || hre.ovn.setting) {
        const strategy = await ethers.getContract('StrategyVenusBusd');

        await (await strategy.setPortfolioManager(core.pm)).wait();
        await (await strategy.setTokens(BSC.busd)).wait();
        await (await strategy.setParams(BSC.vBusd)).wait();

        console.log('StrategyVenusBusd setting done');
    }
};

module.exports.tags = ['base', 'StrategyVenusBusd'];
