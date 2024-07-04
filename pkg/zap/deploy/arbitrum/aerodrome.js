const { ethers } = require("hardhat");
const hre = require("hardhat");
const { FacetCutAction, getSelectors } = require("../../scripts/libraries/diamond");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { getContract, getPrice } = require("@overnight-contracts/common/utils/script-utils");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { BASE } = require("@overnight-contracts/common/utils/assets");
const { deployDiamond, prepareCut, updateFacets } = require("@overnight-contracts/common/utils/deployDiamond");

const name = 'AerodromeCLZap';

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { save, deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deployDiamond(name, deployer);
    const facetNames = [
        'AccessControlFacet',
        'BaseFacet',
        'MathFacet',
        'ProportionFacet',
        'SetUpFacet',
        'ZapFacet'
    ];
    const cut = await prepareCut(facetNames, name, deployer);
    await updateFacets(cut, name);

    let zap = await ethers.getContract(name);

    let coreParams = {
        odosRouter: BASE.odosRouterV2,
        npm: BASE.aerodromeNpm,
    };
    await (await zap.setCoreParams(coreParams)).wait();
    console.log('setCoreParams done()');
};

module.exports.tags = [name];
