const {ethers} = require("hardhat");

const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {BSC} = require('@overnight-contracts/common/utils/assets');
const {core} = require('@overnight-contracts/common/utils/core');

module.exports = async ({deployments}) => {
    const {save} = deployments;

    if (hre.ovn === undefined || !hre.ovn.noDeploy) {
        await deployProxy('StrategyVenusBUSD', deployments, save);

        console.log('StrategyVenusBUSD deploy done');
    }

    if (hre.ovn === undefined || hre.ovn.setting) {
        const strategy = await ethers.getContract('StrategyVenusBUSD');

        await (await strategy.setPortfolioManager(core.pm)).wait();
        await (await strategy.setTokens(BSC.busd)).wait();
        await (await strategy.setParams(BSC.vBusd)).wait();

        console.log('StrategyVenusBUSD setting done');
    }
};

module.exports.tags = ['base', 'StrategyVenusBUSD'];