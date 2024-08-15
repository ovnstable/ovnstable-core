const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('BalancerSwapPlace', {
        from: deployer,
        args: [],
        log: true,
    });
};

module.exports.tags = ['base', 'BalancerSwapPlace'];
