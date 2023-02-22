const {transferETH, transferAsset} = require("@overnight-contracts/common/utils/script-utils");
const {ARBITRUM} = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deployer} = await getNamedAccounts();

    await transferETH(1, deployer);
    await transferAsset(ARBITRUM.usdc, deployer);
};

module.exports.tags = ['test'];
