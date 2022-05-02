const { ethers } = require("hardhat");
let { POLYGON } = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const stakingRewards = await ethers.getContract("StakingRewards");
    const preOvn = await ethers.getContract("PreOvnToken");

    await (await stakingRewards.setTokens(POLYGON.usdc, preOvn.address)).wait();
    console.log("StakingRewards setting done");
};

module.exports.tags = ['setting', 'StakingRewardsSetting'];
