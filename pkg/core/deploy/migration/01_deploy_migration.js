const {
    getContract,
    initWallet,
} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const {ethers} = require("hardhat");
const sampleModule = require("@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl");

module.exports = async () => {

    let wallet = await initWallet();

    let usdPlus = (await getContract('UsdPlusToken')).connect(wallet);
    let factory = await ethers.getContractFactory('UsdPlusTokenMigration');

    usdPlus = await ethers.getContractAt(factory.interface, usdPlus.address);

    console.log('Try to deploy UsdPlusMigration');

    let impl = await sampleModule.deployProxyImpl(hre, factory, {
        kind: 'uups',
        unsafeSkipStorageCheck: true,
        unsafeAllowRenames: true
    }, usdPlus.address);

    console.log(`Implementation: ${impl.impl}`);
};


module.exports.tags = ['DeployMigration'];
