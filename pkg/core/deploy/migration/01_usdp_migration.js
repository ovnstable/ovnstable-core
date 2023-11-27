const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {getContract, getPrice, execTimelock, initWallet, convertWeights, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const {ethers, upgrades, getNamedAccounts} = require("hardhat");
const sampleModule = require("@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {getImplementationAddress} = require("@openzeppelin/upgrades-core");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    let wallet = await initWallet();

    let usdPlus = (await getContract('UsdPlusToken')).connect(wallet);

    console.log(`Deployer: ${wallet.address}`);

    console.log('UsdPlusToken params before');
    console.log('Some Balance: ' + await usdPlus.balanceOf(wallet.address));
    console.log('Total Supply: ' + await usdPlus.totalSupply());

    console.log('Grant ADMIN role to DEV')
    await execTimelock(async (timelock) => {
        await usdPlus.connect(timelock).grantRole(Roles.UPGRADER_ROLE, wallet.address);
        await usdPlus.connect(timelock).grantRole(Roles.DEFAULT_ADMIN_ROLE, wallet.address);
    });

    console.log('Try to deploy impl ...');

    let factory = await ethers.getContractFactory('UsdPlusToken');
    let impl = await sampleModule.deployProxyImpl(hre, factory, {
        kind: 'uups',
        unsafeSkipStorageCheck: true,
        unsafeAllowRenames: true
    }, usdPlus.address);

    let implAddress = impl.impl;
    console.log(`OUSD implementation: ${implAddress}`);
    console.log(`Current implementation address: ${await getImplementationAddress(ethers.provider, usdPlus.address)}`);

    console.log('Make upgrade USD+');
    await usdPlus.upgradeTo(implAddress);
    console.log(`New implementation address:     ${await getImplementationAddress(ethers.provider, usdPlus.address)}`);

    usdPlus = await ethers.getContractAt('UsdPlusToken', usdPlus.address, wallet);

    await usdPlus.migrationInit();
    let size = 100;
    let length = await usdPlus.migrationBatchLength(size);
    console.log("length", length.toString());
    for(let i = 0; i < length; i++) {
        console.log("i", i);
        await (await usdPlus.migrationBatch(size, i)).wait();
    }

    console.log('UsdPlusToken params after');
    console.log('Some Balance: ' + await usdPlus.balanceOf(wallet.address));
    console.log('Total Supply: ' + await usdPlus.totalSupply());

};

module.exports.tags = ['Migration'];
