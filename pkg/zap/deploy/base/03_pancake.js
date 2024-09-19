const { ethers } = require("hardhat");
const hre = require("hardhat");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const { deployDiamond, deployFacets, prepareCut, updateFacets, updateAbi } = require("@overnight-contracts/common/utils/deployDiamond");
const { transferETH } = require('@overnight-contracts/common/utils/script-utils');

const name = 'PancakeCLZapBase';

module.exports = async ({ getNamedAccounts, deployments }) => {
    // await transferETH(0.00001, "0x0000000000000000000000000000000000000000");
    const { save, deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    let zap = await deployDiamond(name, deployer);
    const facetNames = [
        'AccessControlFacet',
        'PancakePoolMathFacet',
        'PancakeNpmFacet',
        'PancakeAggregatorFacet',
        'PancakeSwapFacet',
        'MathFacet',
        'ProportionFacet',
        'SetUpFacet',
        'ZapFacet'
    ];
    await deployFacets(facetNames, deployer);
    const cut = await prepareCut(facetNames, zap.address, deployer);
    await updateFacets(cut, zap.address);
    await updateAbi(name, zap, facetNames);

    zap = await ethers.getContract(name);
    let coreParams = {
        odosRouter: BASE.odosRouterV2,
        npm: BASE.pancakeNpm,
        slippageBps: 100,
        binSearchIterations: 10
    };
    await (await zap.setCoreParams(coreParams)).wait();

    let masterChefV3 = '0xC6A2Db661D5a5690172d8eB0a7DEA2d3008665A3';
    await (await zap.setMasterChefV3(masterChefV3)).wait();
    console.log('setCoreParams done()');
};

module.exports.tags = [name];
