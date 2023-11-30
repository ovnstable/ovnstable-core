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

    let exchange = (await getContract('Exchange', 'linea_usdt')).connect(wallet);

    console.log('[deployImplementation]');

    let factory = await ethers.getContractFactory('Exchange');
    let impl = await sampleModule.deployProxyImpl(hre, factory, {
        kind: 'uups',
        unsafeSkipStorageCheck: true,
        unsafeAllowRenames: true
    }, exchange.address);

    let implAddress = '0xd861f23e23F8E58135a87eB68f8607C6E775A0BA';
    console.log(`NEW implementation:             ${implAddress}`);
    ``
    console.log(`payoutListener: ${await exchange.payoutListener()}`);
    console.log(`usdPlus:        ${await exchange.usdPlus()}`);

    console.log(`Current implementation address: ${await getImplementationAddress(ethers.provider, exchange.address)}`);
    await (await exchange.upgradeTo(implAddress)).wait();
    console.log(`New implementation address:     ${await getImplementationAddress(ethers.provider, exchange.address)}`);

    exchange = await ethers.getContractAt(factory.interface, exchange.address);

    let payoutManager = await getContract('LineaPayoutManager', 'linea');
    await (await exchange.setPayoutManager(payoutManager.address)).wait();

    console.log(`payoutListener: ${await exchange.payoutManager()}`);
    console.log(`usdPlus:        ${await exchange.usdPlus()}`);

};


module.exports.tags = ['ExchangeMigration'];
