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

    console.log('Grant ADMIN role to DEV')
    await execTimelock(async (timelock) => {
        await usdPlus.connect(timelock).grantRole(Roles.UPGRADER_ROLE, wallet.address);
        await usdPlus.connect(timelock).grantRole(Roles.DEFAULT_ADMIN_ROLE, wallet.address);
    });


    console.log('Try to deploy impl ...');

    let factory = await ethers.getContractFactory('UsdPlusToken');
    let impl = await sampleModule.deployProxyImpl(hre, factory, {
        kind: 'uups',
    }, usdPlus.address);

    let implAddress = impl.impl;
    console.log(`OUSD implementation: ${implAddress}`);
    console.log(`Current implementation address: ${await getImplementationAddress(ethers.provider, usdPlus.address)}`);

    console.log('Make upgrade USD+');
    await usdPlus.upgradeTo(implAddress);
    console.log(`New implementation address:     ${await getImplementationAddress(ethers.provider, usdPlus.address)}`);

    usdPlus = await ethers.getContractAt('UsdPlusToken', usdPlus.address, wallet);

    console.log('UsdPlusToken deploy done()');
    console.log('Symbol:   ' + await usdPlus.symbol());
    console.log('Name:     ' + await usdPlus.name());
    console.log('Decimals: ' + await usdPlus.decimals());

};

module.exports.tags = ['base', 'Migration'];
