const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");
const {getContract} = require("@nomiclabs/hardhat-ethers/internal/helpers");

module.exports = async ({deployments, getNamedAccounts}) => {
    const {deployer} = await getNamedAccounts();
    const {deploy} = deployments;

    let wrappedUsdPus = await getContract('WrappedUsdPlusToken');

    let rateProvider = await deploy('WrappedUsdPlusRateProvider', {
        from: deployer,
        args: [wrappedUsdPus.address],
        log: true,
    });

    console.log(`WrappedUsdPlusRateProvider deployed at ${rateProvider.address}`);
};

module.exports.tags = ['WrappedUsdPlusRateProvider'];
