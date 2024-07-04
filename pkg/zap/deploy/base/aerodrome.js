const { ethers } = require("hardhat");
const hre = require("hardhat");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const { deployDiamond, deployFacets, prepareCut, updateFacets, updateAbi } = require("@overnight-contracts/common/utils/deployDiamond");

const name = 'AerodromeCLZap';

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { save, deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    let zap = await deployDiamond(name, deployer);
    const facetNames = [
        'AccessControlFacet',
        'AerodromeFacet',
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
    };
    await (await zap.setCoreParams(coreParams)).wait();
    console.log('setCoreParams done()');
};

module.exports.tags = [name];
