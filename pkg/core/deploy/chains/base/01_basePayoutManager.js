const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {getContract, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");
const {COMMON} = require("@overnight-contracts/common/utils/assets");
const hre = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;
    const newAdmin =  "0x05129E3CE8C566dE564203B0fd85111bBD84C424";
    await deployProxy('BasePayoutManager', deployments, save);
    let payoutManager = await ethers.getContract('BasePayoutManager');
    const currentWallet =  await getWalletAddress();
    if (currentWallet !==newAdmin) {
        await (await payoutManager.grantRole(Roles.DEFAULT_ADMIN_ROLE, newAdmin)).wait()
        await (await payoutManager.revokeRole(Roles.DEFAULT_ADMIN_ROLE, currentWallet)).wait()
    }


    if (hre.ovn && hre.ovn.setting){

        let roleManager = await ethers.getContract('RoleManager');
        let payoutManager = await ethers.getContract('BasePayoutManager');

        await (await payoutManager.connect.setRoleManager(roleManager.address)).wait();
        await (await payoutManager.setRewardWallet(COMMON.rewardWallet)).wait();
        console.log('setRoleManager done()');

        let exchangeUsdPlus = await getContract('Exchange', 'base');
        let exchangeDaiPlus = await getContract('Exchange', 'base_dai');
        let exchangeUsdcPlus = await getContract('Exchange', 'base_usdc');
        await (await payoutManager.grantRole(Roles.EXCHANGER, exchangeUsdPlus.address)).wait();
        await (await payoutManager.grantRole(Roles.EXCHANGER, exchangeDaiPlus.address)).wait();
        await (await payoutManager.grantRole(Roles.EXCHANGER, exchangeUsdcPlus.address)).wait();
        await (await payoutManager.grantRole(Roles.DEFAULT_ADMIN_ROLE, "0x05129E3CE8C566dE564203B0fd85111bBD84C424")).wait()
        await (await payoutManager.revokeRole(Roles.DEFAULT_ADMIN_ROLE, payoutManager.address)).wait()
        console.log('EXCHANGER role done()');
    } 

};

module.exports.tags = ['BasePayoutManager'];
