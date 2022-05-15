const { ethers, upgrades} = require("hardhat");
const { deployProxy, deployProxyMulti} = require('@overnight-contracts/common/utils/deployProxy');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy, save} = deployments;
    const {deployer} = await getNamedAccounts();

    await deployProxyMulti('StakingRewardQsUsdPlusWeth','StakingRewards', deployments, save);
    await deployProxyMulti('StakingRewardQsUsdPlusWmatic','StakingRewards', deployments, save);
    console.log('Deploy StakingRewards done');
};

module.exports.tags = ['base', 'StakingRewards'];
