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

    let usdPlus = (await getContract('UsdPlusTokenPure')).connect(wallet);

    console.log('[deployImplementation]');

    let factory = await ethers.getContractFactory('UsdPlusTokenPure');
    let impl = await sampleModule.deployProxyImpl(hre, factory, {
        kind: 'uups',
        unsafeSkipStorageCheck: true,
        unsafeAllowRenames: true
    }, usdPlus.address);

    let implAddress = impl.impl;
    console.log(`NEW implementation:             ${implAddress}`);

    console.log(`Current implementation address: ${await getImplementationAddress(ethers.provider, usdPlus.address)}`);
    await (await usdPlus.upgradeTo(implAddress)).wait();
    console.log(`New implementation address:     ${await getImplementationAddress(ethers.provider, usdPlus.address)}`);


    usdPlus = await ethers.getContractAt('UsdPlusTokenPure', usdPlus.address);

    let roleManager = await getContract('RoleManager');
    let payoutManager = await getContract('PayoutManager');
    await (await usdPlus.setRoleManager(roleManager.address)).wait();
    await (await usdPlus.setPayoutManager(payoutManager.address)).wait();

    console.log(`HasRole: ${await roleManager.hasRole(Roles.PORTFOLIO_AGENT_ROLE, wallet.address)}`);

    // await (await usdPlus.fix()).wait();

    console.log(`Pause: ${await usdPlus.paused()}`);
    console.log(`TotalSupply:       ${await usdPlus.totalSupply()}`);
    console.log(`TotalSupplyOwners: ${await usdPlus.totalSupplyOwners()}`);
    await (await usdPlus.pause()).wait();

    console.log(`Pause: ${await usdPlus.paused()}`);
    console.log(`TotalSupply:       ${await usdPlus.totalSupply()}`);
    console.log(`TotalSupplyOwners: ${await usdPlus.totalSupplyOwners()}`);

};


module.exports.tags = ['Pure'];
