const {transferETH, transferAsset} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deployer} = await getNamedAccounts();

    await transferETH(1, deployer);
    await transferAsset('usdc', '0', '0x7b7b957c284c2c227c980d6e2f804311947b84d0', deployer);
};

module.exports.tags = ['test'];
