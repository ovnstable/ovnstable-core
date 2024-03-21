const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {getContract, getWalletAddress, transferETH, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {COMMON} = require("@overnight-contracts/common/utils/assets");
const hre = require("hardhat");
const { Deployer } = require("@matterlabs/hardhat-zksync-deploy");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    if ( hre.network.name === 'localhost') await transferETH(1, await getWalletAddress());

    const deployer = new Deployer(hre, await initWallet());

    let implArtifact = await deployer.loadArtifact('ZkSyncPayoutManager');

    const payoutManager = await deployer.deploy(implArtifact, []);
 
    await payoutManager.deployed();
    console.log('PayoutManager deployed to:', payoutManager.address); 
    /* 
    if (hre.ovn && hre.ovn.setting){

        let roleManager = await ethers.getContract('RoleManager');
        let payoutManager = await ethers.getContract('ZkSyncPayoutManager');

        await (await payoutManager.connect.setRoleManager(roleManager.address)).wait();
        await (await payoutManager.setRewardWallet(COMMON.rewardWallet)).wait();
        console.log('setRoleManager done()');

        let exchangeUsdPlus = await getContract('Exchange', 'zksync');
        await (await payoutManager.grantRole(Roles.EXCHANGER, exchangeUsdPlus.address)).wait();
        console.log('EXCHANGER role done()');
    }  */

};

module.exports.tags = ['ZkSyncPayoutManager'];
