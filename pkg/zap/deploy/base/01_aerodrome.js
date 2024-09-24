const { ethers } = require("hardhat");
const hre = require("hardhat");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const { deployDiamond, deployFacets, prepareCut, updateFacets, updateAbi } = require("@overnight-contracts/common/utils/deployDiamond");
const { transferETH } = require('@overnight-contracts/common/utils/script-utils');

const name = 'AerodromeCLZap';

module.exports = async ({ getNamedAccounts, deployments }) => {
    // await transferETH(0.00001, "0x0000000000000000000000000000000000000000");
    const { save, deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    let zap = await deployDiamond(name, deployer);
    const facetNames = [
        'AccessControlFacet',
        'AerodromePoolMathFacet',
        'AerodromeNpmFacet',
        'AerodromeAggregatorFacet',
        'AerodromeSwapFacet',
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
        npm: BASE.aerodromeNpm,
        slippageBps: 100,
        binSearchIterations: 10
    };
    await (await zap.setCoreParams(coreParams)).wait();
    console.log('setCoreParams done()');
};

module.exports.tags = [name];