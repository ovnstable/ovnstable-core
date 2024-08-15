const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");
const {BASE} = require("@overnight-contracts/common/utils/assets");
const {ethers} = require("hardhat");

module.exports = async ({ deployments }) => {
    const { save } = deployments;
    await deployProxy('InchSwapper', deployments, save);
};

module.exports.tags = ['InchSwapper'];
