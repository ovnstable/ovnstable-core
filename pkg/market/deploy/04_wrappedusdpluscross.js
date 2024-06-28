const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    let roleManager = await getContract('RoleManager');
    let params = {args: [ZERO_ADDRESS, "Wrapped Cross USD+", "wcUSD+", 6, roleManager.address]};

    await deployProxy('WrappedUsdPlusToken', deployments, save, params);
    console.log("WrappedUsdPlusToken created");

    let wrappedUsdPlusToken = await ethers.getContract('WrappedUsdPlusToken');

    await hre.run("verify:verify", {
        address: wrappedUsdPlusToken.address,
        // constructorArguments: params.args,
    });

    console.log('WrappedUsdPlusToken deploy done()');
    console.log('Symbol:      ' + await wrappedUsdPlusToken.symbol());
    console.log('Name:        ' + await wrappedUsdPlusToken.name());
    console.log('Decimals:    ' + await wrappedUsdPlusToken.decimals());
    console.log('RoleManager: ' + await wrappedUsdPlusToken.roleManager());
};

module.exports.tags = ['base', 'WrappedUsdPlusTokenCross'];
