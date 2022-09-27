const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {transferETH} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async (plugin) => {
    const {deploy} = plugin.deployments;
    const {deployer} = await plugin.getNamedAccounts();
    const {save} = plugin.deployments;

    // await transferETH(1, deployer);
    const library = await deploy("WethWbtcLibrary", {
        from: deployer
    });

    let params = {
        factoryOptions: {
            libraries: {
                "WethWbtcLibrary": library.address
            }
        },
        unsafeAllow: ["external-library-linking"]
    };

    await deployProxy('StrategyWethWbtc', plugin.deployments, save, params);
};

module.exports.tags = ['StrategyWethWbtc'];
