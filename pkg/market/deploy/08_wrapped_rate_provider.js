const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const {ethers} = require("hardhat");

module.exports = async ({deployments, getNamedAccounts}) => {
    const {deployer} = await getNamedAccounts();
    const {deploy} = deployments;

    let wrappedUsdPus = await getContract('WrappedUsdPlusToken', 'localhost');

    let rateProvider = await deploy('WrappedUsdPlusRateProvider', {
        from: deployer,
        args: [wrappedUsdPus.address],
        log: true,
    });

    console.log(`WrappedUsdPlusRateProvider deployed at ${rateProvider.address}`);

    if (hre.ovn.verify){
        await hre.run("verify:verify", {
            address: rateProvider.address,
            constructorArguments: [wrappedUsdPus.address],
        });
    }
};

module.exports.tags = ['WrappedUsdPlusRateProvider'];
