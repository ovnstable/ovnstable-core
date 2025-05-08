const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const hre = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;
    await deployProxy('Ovn', deployments, save);
};

module.exports.tags = ['Ovn'];
