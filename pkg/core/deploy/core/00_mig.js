const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {getContract, getPrice, execTimelock, initWallet, convertWeights, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const {ethers} = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    let params = {args: ["USD+", "USD+", 6]};
    hre.ovn = {}
    hre.ovn.gov = true;

    await deployProxy('UsdPlusToken', deployments, save, params);

    let usdPlus = await ethers.getContract('UsdPlusToken');

    console.log('UsdPlusToken deploy done()');
    console.log('Symbol:   ' + await usdPlus.symbol());
    console.log('Name:     ' + await usdPlus.name());
    console.log('Decimals: ' + await usdPlus.decimals());

};

module.exports.tags = ['base', 'Migration'];
