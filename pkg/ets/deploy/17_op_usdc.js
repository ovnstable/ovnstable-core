const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");

module.exports = async (plugin) => {
    const {deploy} = plugin.deployments;
    const {deployer} = await plugin.getNamedAccounts();
    const {save} = plugin.deployments;

    const library = await deploy("OpUsdcLibrary", {
        from: deployer
    });

    let params = {
        factoryOptions: {
            libraries: {
                "OpUsdcLibrary": library.address
            }
        },
        unsafeAllow: ["external-library-linking"]
    };

    await deployProxy('StrategyOpUsdc', plugin.deployments, save, params);
};

module.exports.tags = ['StrategyOpUsdc'];
