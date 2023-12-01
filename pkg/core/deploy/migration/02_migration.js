const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {
    getContract,
    getPrice,
    execTimelock,
    initWallet,
    convertWeights,
    showM2M, transferETH
} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const {ethers, upgrades, getNamedAccounts} = require("hardhat");
const sampleModule = require("@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {getImplementationAddress} = require("@openzeppelin/upgrades-core");
const {sharedBeforeEach, evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {fromAsset} = require("@overnight-contracts/common/utils/decimals");
const {testUsdPlus} = require("@overnight-contracts/common/utils/governance");
const {BigNumber} = require("ethers");

module.exports = async ({deployments}) => {

    let wallet = await initWallet();

    let usdPlus = (await getContract('UsdPlusToken')).connect(wallet);
    let exchange = (await getContract('Exchange')).connect(wallet);

    let factory = await ethers.getContractFactory('UsdPlusTokenMigration');

    usdPlus = await ethers.getContractAt(factory.interface, usdPlus.address);

    let implAddress;

    console.log(`Deployer: ${wallet.address}`);

    console.log('[deployImplementation]');

    let impl = await sampleModule.deployProxyImpl(hre, factory, {
        kind: 'uups',
        unsafeSkipStorageCheck: true,
        unsafeAllowRenames: true
    }, usdPlus.address);

    implAddress = impl.impl;
    console.log(`NEW implementation:              ${implAddress}`);

    console.log('[makeUpgrade]');

    console.log(`Current implementation address: ${await getImplementationAddress(ethers.provider, usdPlus.address)}`);
    await (await usdPlus.upgradeTo(implAddress)).wait();
    console.log(`New implementation address:     ${await getImplementationAddress(ethers.provider, usdPlus.address)}`);

    console.log('[migrationRun]');
    usdPlus = await ethers.getContractAt(factory.interface, usdPlus.address, wallet);

    await (await usdPlus.migrationInit(exchange.address, 6, wallet.address)).wait();
    console.log('MigrationInit done()');

};


module.exports.tags = ['Migration'];
