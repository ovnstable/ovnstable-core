const {
    getContract,
    initWallet,
    transferETH,
    getWalletAddress,
} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const {ethers} = require("hardhat");
const sampleModule = require("@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl");
const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({deployments}) => { 
    let wallet = await initWallet();

    await transferETH(1, await getWalletAddress())

    let usdPlus = (await getContract('UsdPlusToken')).connect(wallet);
    let factory = await ethers.getContractFactory('UsdPlusTokenMigration');

    usdPlus = await ethers.getContractAt(factory.interface, usdPlus.address);

    console.log('Try to deploy UsdPlusMigration'); 
    hre.ovn.impl = true;

    const impl = await deployProxyMulti('UsdPlusToken', 'UsdPlusTokenMigration', deployments, deployments.save, {});

/*      const impl = await deployments.deploy('UsdPlusTokenMigration', {
        log: true,
        from: await getWalletAddress(),
        args:[]
      });
 */ 
     /*   let impl = await sampleModule.deployProxyImpl(hre, factory, {
        kind: 'uups',
        unsafeSkipStorageCheck: true,
        unsafeAllowRenames: true
    }, usdPlus.address);   */
 
    console.log(`Implementation: ${impl}`);  
};


module.exports.tags = ['DeployMigration'];
