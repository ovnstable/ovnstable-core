const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");
const {ethers} = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;
    await deployProxy('OvnTimelock', deployments, save);


};

module.exports.tags = ['OvnTimelock'];
