const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {COMMON} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;
    await deployProxy('LineaPayoutManager', deployments, save);

    let roleManager = await ethers.getContract('RoleManager');

    let payoutManager = await ethers.getContract('LineaPayoutManager');

    await (await payoutManager.setRoleManager(roleManager.address)).wait();
    await (await payoutManager.setRewardWallet(COMMON.rewardWallet)).wait();
    console.log('setRoleManager done()');

    let exchangeUsdPlus = await getContract('Exchange', 'linea');
    let exchangeUsdtPlus = await getContract('Exchange', 'linea_usdt');
    await (await payoutManager.grantRole(Roles.EXCHANGER, exchangeUsdPlus.address)).wait();
    await (await payoutManager.grantRole(Roles.EXCHANGER, exchangeUsdtPlus.address)).wait();
    console.log('EXCHANGER role done()');
};

module.exports.tags = ['LineaPayoutManager'];
