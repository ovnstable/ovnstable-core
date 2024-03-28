const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {getContract, getWalletAddress, transferETH, getContractByAddress, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {COMMON} = require("@overnight-contracts/common/utils/assets");
const hre = require("hardhat");
const { Deployer } = require("@matterlabs/hardhat-zksync-deploy");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    if ( hre.network.name === 'localhost') await transferETH(1, await getWalletAddress());

    await deployProxy('ZkSyncPayoutManager', deployments, save);

    /*
// deploy pure contract implementation
    let implArtifact = await deployer.loadArtifact('ZkSyncPayoutManager');
    const payoutManager = await deployer.deploy(implArtifact, []);
    await payoutManager.deployed();
    */
/*
// deploy and initialize a pure proxy
    const deployer = new Deployer(hre, await initWallet());
    let implAddress = '0x9Ee1CB5Fa5C89ba56F98282B01175b987F3E5339';
 
    let proxyArtifact = await deployer.loadArtifact('ERC1967Proxy');
    let implArtifact = await deployer.loadArtifact('ZkSyncPayoutManager') 
    let implContract = await getContractByAddress('ZkSyncPayoutManager','0x9Ee1CB5Fa5C89ba56F98282B01175b987F3E5339','zksync')


    let initializeData = implContract.interface.getFunction('initialize');

    let implData = implContract.interface.encodeFunctionData(initializeData, []);

    const proxy = await deployer.deploy(proxyArtifact, [implAddress,implData] );

    console.log(`Proxy ZkSyncPayoutManager deployed at ${proxy.address}`);

    await save('ZkSyncPayoutManager', {
        address: proxy.address,
        implementation: implAddress,
        ...implArtifact
    });
*/
    
    if (hre.ovn && hre.ovn.setting){

        let roleManager = await ethers.getContract('RoleManager');
        let payoutManager = await ethers.getContract('ZkSyncPayoutManager');

        await (await payoutManager.setRoleManager(roleManager.address)).wait();
        await (await payoutManager.setRewardWallet(COMMON.rewardWallet)).wait();
        console.log('setRoleManager done()');

        let exchangeUsdPlus = await getContract('Exchange', 'zksync');
        await (await payoutManager.grantRole(Roles.EXCHANGER, exchangeUsdPlus.address)).wait();
        console.log('EXCHANGER role done()');
    } 

};

module.exports.tags = ['ZkSyncPayoutManager'];
