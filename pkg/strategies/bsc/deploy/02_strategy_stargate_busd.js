const {ethers} = require("hardhat");

const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {BSC} = require('@overnight-contracts/common/utils/assets');
const {core} = require('@overnight-contracts/common/utils/core');

let stgToken = '0xB0D502E938ed5f4df2E681fE6E419ff29631d62b';
let stargateRouter = '0x4a364f8c717cAAD9A442737Eb7b8A55cc6cf18D8';
let pool = '0x98a5737749490856b401DB5Dc27F522fC314A4e1';
let lpStaking = '0x3052A0F6ab15b4AE1df39962d5DdEFacA86DaB47';
let pid = 1;

module.exports = async ({deployments}) => {
    const {save} = deployments;

    if (hre.ovn === undefined || !hre.ovn.noDeploy) {
        await deployProxy('StrategyStargateBUSD', deployments, save);
        console.log('StrategyStargateBUSD deploy done');
    }

    if (hre.ovn === undefined || hre.ovn.setting) {
        const strategy = await ethers.getContract('StrategyStargateBUSD');

        await (await strategy.setPortfolioManager(core.pm)).wait();
        await (await strategy.setTokens(BSC.busd, stgToken)).wait();
        await (await strategy.setParams(stargateRouter, pool, lpStaking, BSC.pancakeRouter, pid)).wait();

        console.log('StrategyStargateBUSD setting done');
    }
};

module.exports.tags = ['base', 'StrategyStargateBUSD'];