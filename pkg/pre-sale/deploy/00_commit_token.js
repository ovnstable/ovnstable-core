const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
const {ethers} = require("hardhat");
const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();
    const {save} = deployments;

    let params = {args: ["CommitToken", "CommitToken", 6]}

    await deployProxy('CommitToken', deployments, save, params);

};

module.exports.tags = ['CommitToken'];
