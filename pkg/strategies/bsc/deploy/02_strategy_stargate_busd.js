const {ethers} = require("hardhat");

const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {BSC} = require('@overnight-contracts/common/utils/assets');
const {core} = require('@overnight-contracts/common/utils/core');

let stgToken = '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590';
let stargateRouter = '0x45A01E4e04F14f7A4a6702c74187c5F6222033cd';
let pool = '0x1205f31718499dBf1fCa446663B532Ef87481fe1';
let lpStaking = '0x8731d54E9D02c286767d56ac03e8037C07e01e98';
let pid = 0;

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