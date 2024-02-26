const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {
    getContract,
    getPrice,
    execTimelock,
    initWallet,
    convertWeights,
    showM2M, transferETH, getERC20ByAddress, transferAsset
} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const {ethers, upgrades, getNamedAccounts} = require("hardhat");
const sampleModule = require("@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {getImplementationAddress} = require("@openzeppelin/upgrades-core");
const {sharedBeforeEach, evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {fromAsset, toE6, toAsset} = require("@overnight-contracts/common/utils/decimals");
const {testUsdPlus} = require("@overnight-contracts/common/utils/governance");
const {BigNumber} = require("ethers");
const {createRandomWallet, prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");
const {getEmptyOdosData} = require("@overnight-contracts/common/utils/odos-helper");

module.exports = async ({deployments}) => {

    let wallet = await initWallet();

    let usdPlus = (await getContract('UsdPlusToken')).connect(wallet);
    let factory = await ethers.getContractFactory('UsdPlusToken');
    usdPlus = await ethers.getContractAt(factory.interface, usdPlus.address);

    console.log('1. Deploy just implementation');

    let usdpImpl = await sampleModule.deployProxyImpl(hre, factory, {
        kind: 'uups'
    }, usdPlus.address);

    // console.log("usdPlus.address", usdPlus.address);

    console.log(`New implementation: ${usdpImpl.impl}`);

    // await execTimelock(async (timelock) => {
    //     await usdPlus.connect(timelock).upgradeTo(usdpImpl.impl);
    // });

    // console.log(`New implementation: ${await getImplementationAddress(ethers.provider, usdPlus.address)}`);








    let exchange = (await getContract('Exchange')).connect(wallet);
    let factory2 = await ethers.getContractFactory('Exchange');
    exchange = await ethers.getContractAt(factory2.interface, exchange.address);

    console.log('2. Deploy just implementation');

    let exchImpl = await sampleModule.deployProxyImpl(hre, factory2, {
        kind: 'uups'
    }, exchange.address);

    // console.log("exch.address", exchange.address);

    console.log(`New implementation: ${exchImpl.impl}`);

    // await execTimelock(async (timelock) => {
    //     await exchange.connect(timelock).upgradeTo(exchImpl.impl);
    // });

    // console.log(`New implementation: ${await getImplementationAddress(ethers.provider, exchange.address)}`);



    console.log(`upgradeTo done`);



};


module.exports.tags = ['AuditUpgrade'];
