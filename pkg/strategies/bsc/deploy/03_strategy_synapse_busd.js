const {ethers} = require("hardhat");

const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {BSC} = require('@overnight-contracts/common/utils/assets');
const {core} = require('@overnight-contracts/common/utils/core');

let nUsdLPToken = '0x7479e1Bc2F2473f9e78c89B4210eb6d55d33b645';
let synToken = '0xf8F9efC0db77d8881500bb06FF5D6ABc3070E695';
let swap = '0x85fCD7Dd0a1e1A9FCD5FD886ED522dE8221C3EE5';
let miniChefV2 = '0x7875Af1a6878bdA1C129a4e2356A3fD040418Be5';
let pid = 1;

module.exports = async ({deployments}) => {
    const {save} = deployments;

    if (hre.ovn === undefined || !hre.ovn.noDeploy) {
        await deployProxy('StrategySynapseBUSD', deployments, save);

        console.log('StrategySynapseBUSD deploy done');
    }

    if (hre.ovn === undefined || hre.ovn.setting) {
        const strategy = await ethers.getContract('StrategySynapseBUSD');

        await (await strategy.setPortfolioManager(core.pm)).wait();
        await (await strategy.setTokens(BSC.usdc, nUsdLPToken, synToken)).wait();
        await (await strategy.setParams(swap, miniChefV2, BSC.pancakeRouter, pid)).wait();

        console.log('StrategySynapseBUSD setting done');
    }
};

module.exports.tags = ['base', 'StrategySynapseBUSD'];