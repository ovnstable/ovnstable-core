const {transferETH, transferAsset} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deployer} = await getNamedAccounts();

    await transferETH(1, deployer);

    console.log('[TEST] Buy assets ....');
    if (process.env.STAND === "optimism") {
        await transferAsset(OPTIMISM.usdc, deployer);
    }else if (process.env.STAND === "optimism_dai"){
        await transferAsset(OPTIMISM.dai, deployer);
    }
};

module.exports.tags = ['test'];
